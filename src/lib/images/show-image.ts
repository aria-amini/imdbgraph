import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

import { createDb } from '@/db/connection'
import { showImage } from '@/db/tables'
import { getStorage, type Storage, type StoredImage } from '@/lib/images/s3'
import { fetchShowEnrichment, type ShowAiring } from '@/lib/images/tvmaze'
import { imdbIdSchema } from '@/lib/imdb/ratings'

export interface ShowImage extends ShowAiring {
	url: string
}

/** Loads a show's image through the server-function boundary. */
export const getShowImage = createServerFn({ method: 'GET' })
	.validator(imdbIdSchema)
	.handler(async ({ data: imdbId }) => {
		try {
			return await getShowImageDb(createDb(), imdbId)
		} catch (error) {
			console.warn(`Failed to load image for ${imdbId}`, error)
			return null
		}
	})

/** Returns the image and airing metadata for a show, fetching on first view. */
export async function getShowImageDb(
	db: NodePgDatabase,
	imdbId: string,
	storage: Storage = getStorage(),
): Promise<ShowImage | null> {
	const cached = await loadShowImageRecord(db, imdbId)
	if (cached !== undefined) {
		return toShowImage(imdbId, cached)
	}

	// In-process cooldown so an unreachable TVmaze does not slow every view.
	if (isCoolingDown(imdbId)) {
		return null
	}
	return fetchAndStore(db, imdbId, storage)
}

/**
 * Loads the stored poster bytes and self-heals rows whose object was lost in
 * storage: dropping the stale row lets the next view re-fetch the poster
 * instead of 404ing forever.
 */
export async function getStoredImage(
	db: NodePgDatabase,
	imdbId: string,
	storage: Storage = getStorage(),
): Promise<StoredImage | null> {
	const [row] = await db
		.select({
			objectKey: showImage.objectKey,
			contentType: showImage.contentType,
		})
		.from(showImage)
		.where(eq(showImage.imdbId, imdbId))
		.limit(1)
	if (!row?.objectKey) {
		return null
	}

	const stored = await storage.get(row.objectKey)
	if (!stored) {
		await db.delete(showImage).where(eq(showImage.imdbId, imdbId))
		return null
	}
	return { data: stored.data, contentType: stored.contentType }
}

// =============================================================================
// Helpers
// =============================================================================

type ShowImageRecord = Pick<
	typeof showImage.$inferSelect,
	'objectKey' | 'status' | 'network' | 'airsDays' | 'airsTime'
>

async function loadShowImageRecord(
	db: NodePgDatabase,
	imdbId: string,
): Promise<ShowImageRecord | undefined> {
	const [row] = await db
		.select({
			objectKey: showImage.objectKey,
			status: showImage.status,
			network: showImage.network,
			airsDays: showImage.airsDays,
			airsTime: showImage.airsTime,
		})
		.from(showImage)
		.where(eq(showImage.imdbId, imdbId))
		.limit(1)
	return row
}

/**
 * No transaction here: the pooled connection must not be held across external
 * I/O. Concurrent first views may fetch redundantly; the stable object key and
 * the idempotent insert keep the stored state correct regardless.
 */
async function fetchAndStore(
	db: NodePgDatabase,
	imdbId: string,
	storage: Storage,
): Promise<ShowImage | null> {
	try {
		const enrichment = await fetchShowEnrichment(imdbId)
		if (!enrichment) {
			// Definitively missing upstream; remember it so later views skip the API.
			await db
				.insert(showImage)
				.values({ imdbId, objectKey: null })
				.onConflictDoNothing()
			return null
		}

		const downloaded = await downloadImage(enrichment.posterUrl)
		const objectKey = `thumbnails/${imdbId}.${downloaded.extension}`
		const record: ShowImageRecord = {
			objectKey,
			status: enrichment.status,
			network: enrichment.network,
			airsDays: enrichment.airsDays.length > 0 ? enrichment.airsDays : null,
			airsTime: enrichment.airsTime,
		}
		await storage.put(objectKey, downloaded.body, downloaded.contentType)
		await db
			.insert(showImage)
			.values({ imdbId, contentType: downloaded.contentType, ...record })
			.onConflictDoNothing()
		return toShowImage(imdbId, record)
	} catch (error) {
		noteFailure(imdbId)
		throw error
	}
}

function toShowImage(
	imdbId: string,
	record: ShowImageRecord,
): ShowImage | null {
	if (!record.objectKey) {
		return null
	}
	return {
		url: `/api/thumbnails/${imdbId}`,
		status: record.status,
		network: record.network,
		airsDays: record.airsDays ?? [],
		airsTime: record.airsTime,
	}
}

async function downloadImage(url: string): Promise<DownloadedImage> {
	const response = await fetch(url, {
		signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
	})
	if (!response.ok || !response.body) {
		throw new Error(`thumbnail download failed with status ${response.status}`)
	}

	const contentType = (response.headers.get('content-type') ?? '')
		.split(';')[0]!
		.trim()
		.toLowerCase()
	const extension = EXTENSIONS[contentType]
	if (!extension) {
		throw new Error(`unsupported thumbnail content type "${contentType}"`)
	}

	const chunks: Uint8Array[] = []
	let total = 0
	for await (const chunk of response.body) {
		total += chunk.byteLength
		if (total > MAX_IMAGE_BYTES) {
			throw new Error('thumbnail exceeds size limit')
		}
		chunks.push(chunk)
	}

	const body = new Uint8Array(total)
	let offset = 0
	for (const chunk of chunks) {
		body.set(chunk, offset)
		offset += chunk.byteLength
	}
	return { body, contentType, extension }
}

interface DownloadedImage {
	body: Uint8Array
	contentType: string
	extension: string
}

const DOWNLOAD_TIMEOUT_MS = 10_000
const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const RETRY_DELAY_MS = 60_000
const EXTENSIONS: Record<string, string> = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp',
}

const cooldowns = new Map<string, number>()
const MAX_COOLDOWN_ENTRIES = 1000

function isCoolingDown(imdbId: string): boolean {
	const failedAt = cooldowns.get(imdbId)
	if (failedAt === undefined) {
		return false
	}
	if (Date.now() - failedAt > RETRY_DELAY_MS) {
		cooldowns.delete(imdbId)
		return false
	}
	return true
}

function noteFailure(imdbId: string): void {
	const now = Date.now()
	for (const [id, failedAt] of cooldowns) {
		if (now - failedAt > RETRY_DELAY_MS) {
			cooldowns.delete(id)
		}
	}
	// Eviction walks insertion order (oldest first); 1000 in-flight failures
	// inside one cooldown window means something is badly wrong anyway.
	while (cooldowns.size >= MAX_COOLDOWN_ENTRIES) {
		cooldowns.delete(cooldowns.keys().next().value!)
	}
	cooldowns.set(imdbId, now)
}
