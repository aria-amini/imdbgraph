import { eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { Pool, PoolClient } from 'pg'

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
	db: NodePgDatabase & { $client: Pool },
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

async function fetchAndStore(
	db: NodePgDatabase & { $client: Pool },
	imdbId: string,
	storage: Storage,
): Promise<ShowImage | null> {
	const client = await db.$client.connect()
	try {
		await client.query('BEGIN')
		// Serialize per-title so concurrent first views of a show fetch once.
		await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [imdbId])

		const { rows } = await client.query<ThumbnailRecord>(
			`SELECT object_key AS "objectKey", status, network,
			        airs_days AS "airsDays", airs_time AS "airsTime"
			 FROM thumbnail WHERE imdb_id = $1`,
			[imdbId],
		)
		const raced = rows[0]
		if (raced) {
			await client.query('COMMIT')
			return toShowImage(imdbId, raced)
		}

		const enrichment = await fetchShowEnrichment(imdbId)
		if (!enrichment) {
			// Definitively missing upstream; remember it so later views skip the API.
			await insertThumbnail(client, {
				imdbId,
				objectKey: null,
				contentType: null,
				status: null,
				network: null,
				airsDays: null,
				airsTime: null,
			})
			await client.query('COMMIT')
			return null
		}

		const downloaded = await downloadImage(enrichment.url)
		const objectKey = `thumbnails/${imdbId}.${downloaded.extension}`
		await storage.put(objectKey, downloaded.body, downloaded.contentType)
		await insertThumbnail(client, {
			imdbId,
			objectKey,
			contentType: downloaded.contentType,
			status: enrichment.status,
			network: enrichment.network,
			airsDays: enrichment.airsDays.length > 0 ? enrichment.airsDays : null,
			airsTime: enrichment.airsTime,
		})
		await client.query('COMMIT')

		return toShowImage(imdbId, {
			objectKey,
			status: enrichment.status,
			network: enrichment.network,
			airsDays: enrichment.airsDays.length > 0 ? enrichment.airsDays : null,
			airsTime: enrichment.airsTime,
		})
	} catch (error) {
		noteFailure(imdbId)
		try {
			await client.query('ROLLBACK')
		} catch (rollbackError) {
			throw new Error('Failed to rollback thumbnail transaction', {
				cause: rollbackError,
			})
		}
		throw error
	} finally {
		client.release()
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
	client: PoolClient,
	thumbnailData: NewThumbnail,
): Promise<void> {
	await client.query(
		`INSERT INTO thumbnail
			(imdb_id, object_key, content_type, status, network, airs_days, airs_time)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 ON CONFLICT (imdb_id) DO NOTHING`,
		[
			thumbnailData.imdbId,
			thumbnailData.objectKey,
			thumbnailData.contentType,
			thumbnailData.status,
			thumbnailData.network,
			thumbnailData.airsDays,
			thumbnailData.airsTime,
		],
	)
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
	cooldowns.set(imdbId, Date.now())
}
