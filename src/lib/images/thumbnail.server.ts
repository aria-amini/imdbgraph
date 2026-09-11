import { eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

import { thumbnail } from '@/db/tables'
import { getStorage, type Storage } from '@/lib/images/s3'
import type { ShowImage } from '@/lib/images/thumbnail'
import { fetchShowEnrichment } from '@/lib/images/tvmaze'

interface ThumbnailRecord {
	objectKey: string | null
	status: string | null
	network: string | null
	airsDays: string[] | null
	airsTime: string | null
}

const DOWNLOAD_TIMEOUT_MS = 10_000
const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const RETRY_DELAY_MS = 60_000
const EXTENSIONS: Record<string, string> = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp',
}

/** Returns the image and airing metadata for a show, fetching on first view. */
export async function getShowImageDb(
	db: NodePgDatabase,
	imdbId: string,
	storage: Storage = getStorage(),
): Promise<ShowImage | null> {
	const cached = await loadThumbnail(db, imdbId)
	if (cached !== undefined) {
		return toShowImage(imdbId, cached)
	}

	// In-process cooldown so an unreachable TVmaze does not slow every view.
	if (isCoolingDown(imdbId)) {
		return null
	}
	return fetchAndStore(db, imdbId, storage)
}

// =============================================================================
// Helpers
// =============================================================================

async function loadThumbnail(
	db: NodePgDatabase,
	imdbId: string,
): Promise<ThumbnailRecord | undefined> {
	const [row] = await db
		.select({
			objectKey: thumbnail.objectKey,
			status: thumbnail.status,
			network: thumbnail.network,
			airsDays: thumbnail.airsDays,
			airsTime: thumbnail.airsTime,
		})
		.from(thumbnail)
		.where(eq(thumbnail.imdbId, imdbId))
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
			await insertThumbnail(db, {
				imdbId,
				objectKey: null,
				contentType: null,
				status: null,
				network: null,
				airsDays: null,
				airsTime: null,
			})
			return null
		}

		const downloaded = await downloadImage(enrichment.url)
		const objectKey = `thumbnails/${imdbId}.${downloaded.extension}`
		await storage.put(objectKey, downloaded.body, downloaded.contentType)
		const record = {
			objectKey,
			status: enrichment.status,
			network: enrichment.network,
			airsDays: enrichment.airsDays.length > 0 ? enrichment.airsDays : null,
			airsTime: enrichment.airsTime,
		}
		await insertThumbnail(db, {
			imdbId,
			contentType: downloaded.contentType,
			...record,
		})
		return toShowImage(imdbId, record)
	} catch (error) {
		noteFailure(imdbId)
		throw error
	}
}

interface NewThumbnail {
	imdbId: string
	objectKey: string | null
	contentType: string | null
	status: string | null
	network: string | null
	airsDays: string[] | null
	airsTime: string | null
}

async function insertThumbnail(
	db: NodePgDatabase,
	thumbnailData: NewThumbnail,
): Promise<void> {
	await db.insert(thumbnail).values(thumbnailData).onConflictDoNothing()
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

function toShowImage(
	imdbId: string,
	record: ThumbnailRecord,
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
