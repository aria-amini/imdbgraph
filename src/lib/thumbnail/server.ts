import { randomUUID } from 'node:crypto'

import { and, eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

import { createDb } from '@/db/connection'
import { show, showImage } from '@/db/tables'
import {
	deleteImageObject,
	getStorage,
	type Storage,
	type StoredImage,
} from '@/lib/s3'
import { fetchShowEnrichment, parsePosterUrl } from '@/lib/thumbnail/tvmaze'

/**
 * Returns the stored poster bytes, fetching and persisting the poster on
 * first view. Returns null when the show is known to have no poster or when
 * the stored object was lost; the next view re-fetches in that case.
 */
export async function getPosterImageBytes(
	imdbId: string,
): Promise<StoredImage | null> {
	const db = createDb()
	const storage = getStorage()
	const record = await resolveShowImage(db, imdbId, storage)
	if (!record?.objectKey) {
		return null
	}
	const stored = await storage.get(record.objectKey)
	if (!stored) {
		await dropStaleImageRow(db, imdbId, record.objectKey)
	}
	return stored
}

/** Returns the image row for a show, fetching and storing it on first view. */
async function resolveShowImage(
	db: NodePgDatabase,
	imdbId: string,
	storage: Storage,
): Promise<ShowImageRecord | null> {
	const cached = await loadShowImageRecord(db, imdbId)
	if (cached !== undefined) {
		return cached
	}

	// In-process cooldown so an unreachable TVmaze does not slow every view.
	if (isCoolingDown(imdbId)) {
		return null
	}
	// A row cannot exist without its parent show; skip the external fetch and
	// the storage upload for ids the catalog does not know.
	if (!(await showExists(db, imdbId))) {
		return null
	}
	// Upload immutable candidates without holding a database connection across I/O.
	// The unique IMDb ID chooses one winner, including known-missing results.
	let uploadedKey: string | null = null
	try {
		const enrichment = await fetchShowEnrichment(imdbId)
		let record: typeof showImage.$inferInsert = { imdbId, objectKey: null }
		if (enrichment) {
			const downloaded = await downloadImage(enrichment.posterUrl)
			const objectKey = `thumbnails/${imdbId}/${randomUUID()}.${downloaded.extension}`
			record = {
				imdbId,
				objectKey,
				contentType: downloaded.contentType,
				status: enrichment.status,
				network: enrichment.network,
				airsDays: enrichment.airsDays.length > 0 ? enrichment.airsDays : null,
				airsTime: enrichment.airsTime,
			}
			await storage.put(objectKey, downloaded.body, downloaded.contentType)
			uploadedKey = objectKey
		}
		// On an ambiguous database error, retain the candidate: deleting it
		// could remove an object whose insert actually committed.
		const [inserted] = await db
			.insert(showImage)
			.values(record)
			.onConflictDoNothing()
			.returning()
		if (inserted) {
			return inserted
		}
		if (uploadedKey) {
			await deleteImageObject(storage, uploadedKey)
		}
		const winner = await loadShowImageRecord(db, imdbId)
		return winner ?? null
	} catch (error) {
		// A foreign-key rejection means the insert definitely did not commit,
		// so the candidate is unreachable and must not leak in storage.
		if (uploadedKey && isForeignKeyViolation(error)) {
			await deleteImageObject(storage, uploadedKey)
		}
		noteFailure(imdbId)
		throw error
	}
}

// =============================================================================
// Helpers
// =============================================================================

type ShowImageRecord = Pick<
	typeof showImage.$inferSelect,
	'objectKey' | 'status' | 'network' | 'airsDays' | 'airsTime'
>

async function showExists(
	db: NodePgDatabase,
	imdbId: string,
): Promise<boolean> {
	const [row] = await db
		.select({ imdbId: show.imdbId })
		.from(show)
		.where(eq(show.imdbId, imdbId))
		.limit(1)
	return row !== undefined
}

// Drizzle wraps the driver error, so the postgres code can sit one or more
// causes deep.
function isForeignKeyViolation(error: unknown): boolean {
	let current: unknown = error
	for (let depth = 0; depth < 5; depth++) {
		if (typeof current !== 'object' || current === null) {
			return false
		}
		if ('code' in current && current.code === '23503') {
			return true
		}
		if (!('cause' in current)) {
			return false
		}
		current = current.cause
	}
	return false
}

/**
 * Drops a row whose object was lost in storage so the next view re-fetches
 * the poster instead of 404ing forever. Keyed by object to keep a stale read
 * from deleting a replacement row.
 */
async function dropStaleImageRow(
	db: NodePgDatabase,
	imdbId: string,
	objectKey: string,
): Promise<void> {
	await db
		.delete(showImage)
		.where(
			and(eq(showImage.imdbId, imdbId), eq(showImage.objectKey, objectKey)),
		)
}

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

async function downloadImage(url: string): Promise<DownloadedImage> {
	const response = await fetch(parsePosterUrl(url), {
		redirect: 'error',
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
