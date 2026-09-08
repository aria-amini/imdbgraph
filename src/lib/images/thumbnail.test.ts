import { createServer, type Server } from 'node:http'

import { initDb } from '@config/test/db'
import { eq } from 'drizzle-orm'
import {
	GenericContainer,
	Wait,
	type StartedTestContainer,
} from 'testcontainers'
import { afterAll, afterEach, beforeAll, describe, expect, vi } from 'vitest'

import { show, thumbnail } from '@/db/tables'
import { createStorage, type Storage } from '@/lib/images/s3'
import { getShowImageDb } from '@/lib/images/thumbnail.server'
import { fetchShowEnrichment } from '@/lib/images/tvmaze'

vi.mock('@/lib/images/tvmaze', () => ({
	fetchShowEnrichment: vi.fn(),
}))

const PNG_BYTES = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
	'base64',
)

const FETCHED_ID = 'tt0417299'
const MISSING_ID = 'tt11111111'
const FAILING_ID = 'tt22222222'
const CONCURRENT_ID = 'tt33333333'

const counts = { download: 0 }
let imageBytes: Uint8Array | undefined
let imageServerUrl = ''

let storage: Storage
let imageServer: Server
let minio: StartedTestContainer

beforeAll(async () => {
	imageServer = createServer((_req, res) => {
		counts.download++
		if (!imageBytes) {
			res.writeHead(500)
			res.end()
			return
		}
		res.writeHead(200, { 'content-type': 'image/png' })
		res.end(imageBytes)
	})
	await new Promise<void>((resolve) =>
		imageServer.listen(0, '127.0.0.1', resolve),
	)
	const address = imageServer.address()
	if (address === null || typeof address === 'string') {
		throw new Error('image server failed to bind')
	}
	imageServerUrl = `http://127.0.0.1:${address.port}/poster.jpg`

	minio = await new GenericContainer('minio/minio:RELEASE.2025-09-07T16-13-09Z')
		.withCommand(['server', '/data'])
		.withEnvironment({
			MINIO_ROOT_USER: 'testuser',
			MINIO_ROOT_PASSWORD: 'testpass123',
		})
		.withExposedPorts(9000)
		// The image has no shell or healthcheck, so the default port probes
		// cannot exec; the startup log signals readiness instead.
		.withWaitStrategy(Wait.forLogMessage(/API: http/, 1))
		.start()
	storage = createStorage({
		endpointUrl: `http://127.0.0.1:${minio.getMappedPort(9000)}`,
		bucketName: 'thumbnail-tests',
		accessKeyId: 'testuser',
		secretAccessKey: 'testpass123',
	})
}, 180_000)

afterEach(() => {
	imageBytes = undefined
	counts.download = 0
	vi.mocked(fetchShowEnrichment).mockReset()
})

afterAll(async () => {
	await new Promise<void>((resolve) => imageServer.close(() => resolve()))
	await minio.stop()
})

const test = initDb(async (db) => {
	await db.insert(show).values(
		[FETCHED_ID, MISSING_ID, FAILING_ID, CONCURRENT_ID].map((imdbId) => ({
			imdbId,
			title: `Show ${imdbId}`,
			startYear: '2020',
		})),
	)
})

describe('thumbnail pipeline', () => {
	test('fetches and stores an image on first view', async ({ db }) => {
		vi.mocked(fetchShowEnrichment).mockResolvedValue({
			url: imageServerUrl,
			status: 'Ended',
			network: 'HBO',
			airsDays: ['Monday'],
			airsTime: '21:00',
		})
		imageBytes = PNG_BYTES

		const result = await getShowImageDb(db, FETCHED_ID, storage)

		expect(result).toEqual({
			url: `/api/thumbnails/${FETCHED_ID}`,
			status: 'Ended',
			network: 'HBO',
			airsDays: ['Monday'],
			airsTime: '21:00',
		})
		expect(fetchShowEnrichment).toHaveBeenCalledTimes(1)

		const [row] = await db
			.select()
			.from(thumbnail)
			.where(eq(thumbnail.imdbId, FETCHED_ID))
		expect(row?.objectKey).toBe(`thumbnails/${FETCHED_ID}.png`)
		expect(row?.contentType).toBe('image/png')
		expect(row?.status).toBe('Ended')
		expect(row?.network).toBe('HBO')
		expect(row?.airsDays).toEqual(['Monday'])
		expect(row?.airsTime).toBe('21:00')

		const stored = await storage.get(row!.objectKey!)
		expect(Buffer.from(stored!.data).equals(PNG_BYTES)).toBe(true)
		expect(stored?.contentType).toBe('image/png')

		await getShowImageDb(db, FETCHED_ID, storage)
		expect(fetchShowEnrichment).toHaveBeenCalledTimes(1)
		expect(counts.download).toBe(1)
	})

	test('caches a known-missing image', async ({ db }) => {
		vi.mocked(fetchShowEnrichment).mockResolvedValue(null)

		const result = await getShowImageDb(db, MISSING_ID, storage)
		expect(result).toBeNull()

		const [row] = await db
			.select()
			.from(thumbnail)
			.where(eq(thumbnail.imdbId, MISSING_ID))
		expect(row?.objectKey).toBeNull()

		await getShowImageDb(db, MISSING_ID, storage)
		expect(fetchShowEnrichment).toHaveBeenCalledTimes(1)
	})

	test('transient failures leave no row and back off', async ({ db }) => {
		vi.mocked(fetchShowEnrichment).mockResolvedValue({
			url: imageServerUrl,
			status: 'Ended',
			network: 'HBO',
			airsDays: ['Monday'],
			airsTime: '21:00',
		})

		await expect(getShowImageDb(db, FAILING_ID, storage)).rejects.toThrow(
			'thumbnail download failed with status 500',
		)

		const rows = await db
			.select()
			.from(thumbnail)
			.where(eq(thumbnail.imdbId, FAILING_ID))
		expect(rows).toHaveLength(0)

		await getShowImageDb(db, FAILING_ID, storage)
		expect(fetchShowEnrichment).toHaveBeenCalledTimes(1)
	})

	test('concurrent views of one show converge on a single row', async ({
		db,
	}) => {
		vi.mocked(fetchShowEnrichment).mockResolvedValue({
			url: imageServerUrl,
			status: 'Ended',
			network: 'HBO',
			airsDays: ['Monday'],
			airsTime: '21:00',
		})
		imageBytes = PNG_BYTES

		const results = await Promise.all([
			getShowImageDb(db, CONCURRENT_ID, storage),
			getShowImageDb(db, CONCURRENT_ID, storage),
		])

		const expected = {
			url: `/api/thumbnails/${CONCURRENT_ID}`,
			status: 'Ended',
			network: 'HBO',
			airsDays: ['Monday'],
			airsTime: '21:00',
		}
		expect(results).toEqual([expected, expected])

		const rows = await db
			.select()
			.from(thumbnail)
			.where(eq(thumbnail.imdbId, CONCURRENT_ID))
		expect(rows).toHaveLength(1)
		expect(rows[0]?.objectKey).toBe(`thumbnails/${CONCURRENT_ID}.png`)

		const stored = await storage.get(rows[0]!.objectKey!)
		expect(Buffer.from(stored!.data).equals(PNG_BYTES)).toBe(true)
	})
})
