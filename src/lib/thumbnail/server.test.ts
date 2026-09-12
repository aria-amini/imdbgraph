import { initDb } from '@config/test/db'
import { eq } from 'drizzle-orm'
import {
	GenericContainer,
	Wait,
	type StartedTestContainer,
} from 'testcontainers'
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	vi,
} from 'vitest'

import { createDb } from '@/db/connection'
import { show, showImage } from '@/db/tables'
import { createStorage, getStorage, type Storage } from '@/lib/s3'
import { getPosterImageBytes } from '@/lib/thumbnail/server'
import { fetchShowEnrichment, type ShowAiring } from '@/lib/thumbnail/tvmaze'

vi.mock(import('@/db/connection'), async (importOriginal) => ({
	...(await importOriginal()),
	createDb: vi.fn(),
}))

vi.mock(import('@/lib/s3'), async (importOriginal) => ({
	...(await importOriginal()),
	getStorage: vi.fn(),
}))

vi.mock(import('@/lib/thumbnail/tvmaze'), async (importOriginal) => ({
	...(await importOriginal()),
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
const STALE_ID = 'tt55555555'
const MISSING_RACE_ID = 'tt66666666'

const HBO_AIRING: ShowAiring = {
	status: 'Ended',
	network: 'HBO',
	airsDays: ['Monday'],
	airsTime: '21:00',
}

const enrichmentFor = (url: string) => ({ posterUrl: url, ...HBO_AIRING })

const counts = { download: 0 }
let imageBytes: Uint8Array | undefined
const imageServerUrl = 'https://static.tvmaze.com/uploads/images/poster.png'

let storage: Storage
let minio: StartedTestContainer | undefined

beforeAll(async () => {
	minio = await new GenericContainer(
		'quay.io/minio/minio:RELEASE.2025-09-07T16-13-09Z',
	)
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

beforeEach(() => {
	vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
		counts.download++
		return imageBytes
			? new Response(Buffer.from(imageBytes), {
					headers: { 'content-type': 'image/png' },
				})
			: new Response(null, { status: 500 })
	})
	vi.mocked(getStorage).mockReturnValue(storage)
})

afterEach(() => {
	vi.restoreAllMocks()
	imageBytes = undefined
	counts.download = 0
	vi.mocked(fetchShowEnrichment).mockReset()
})

afterAll(async () => {
	await minio?.stop()
})

const test = initDb(async (db) => {
	await db.insert(show).values(
		[
			FETCHED_ID,
			MISSING_ID,
			FAILING_ID,
			CONCURRENT_ID,
			STALE_ID,
			MISSING_RACE_ID,
		].map((imdbId) => ({
			imdbId,
			title: `Show ${imdbId}`,
			startYear: '2020',
		})),
	)
})

describe('show image pipeline', () => {
	test('fetches and stores an image on first view', async ({ db }) => {
		vi.mocked(createDb).mockReturnValue(db)
		vi.mocked(fetchShowEnrichment).mockResolvedValue(
			enrichmentFor(imageServerUrl),
		)
		imageBytes = PNG_BYTES

		const result = await getPosterImageBytes(FETCHED_ID)

		expect(result?.contentType).toBe('image/png')
		expect(Buffer.from(result!.data).equals(PNG_BYTES)).toBe(true)
		expect(fetchShowEnrichment).toHaveBeenCalledTimes(1)

		const [row] = await db
			.select()
			.from(showImage)
			.where(eq(showImage.imdbId, FETCHED_ID))
		expect(row?.objectKey).toMatch(
			new RegExp(`^thumbnails/${FETCHED_ID}/.+\\.png$`),
		)
		expect(row?.contentType).toBe('image/png')
		expect(row?.status).toBe('Ended')
		expect(row?.network).toBe('HBO')
		expect(row?.airsDays).toEqual(['Monday'])
		expect(row?.airsTime).toBe('21:00')

		const stored = await storage.get(row!.objectKey!)
		expect(Buffer.from(stored!.data).equals(PNG_BYTES)).toBe(true)
		expect(stored?.contentType).toBe('image/png')

		await getPosterImageBytes(FETCHED_ID)
		expect(fetchShowEnrichment).toHaveBeenCalledTimes(1)
		expect(counts.download).toBe(1)
		expect(fetch).toHaveBeenCalledWith(
			new URL(imageServerUrl),
			expect.objectContaining({ redirect: 'error' }),
		)
	})

	test('caches a known-missing image', async ({ db }) => {
		vi.mocked(createDb).mockReturnValue(db)
		vi.mocked(fetchShowEnrichment).mockResolvedValue(null)

		const result = await getPosterImageBytes(MISSING_ID)
		expect(result).toBeNull()

		const [row] = await db
			.select()
			.from(showImage)
			.where(eq(showImage.imdbId, MISSING_ID))
		expect(row?.objectKey).toBeNull()

		await getPosterImageBytes(MISSING_ID)
		expect(fetchShowEnrichment).toHaveBeenCalledTimes(1)
	})

	test('transient failures leave no row and back off', async ({ db }) => {
		vi.mocked(createDb).mockReturnValue(db)
		vi.mocked(fetchShowEnrichment).mockResolvedValue(
			enrichmentFor(imageServerUrl),
		)

		await expect(getPosterImageBytes(FAILING_ID)).rejects.toThrow(
			'thumbnail download failed with status 500',
		)

		const rows = await db
			.select()
			.from(showImage)
			.where(eq(showImage.imdbId, FAILING_ID))
		expect(rows).toHaveLength(0)

		await getPosterImageBytes(FAILING_ID)
		expect(fetchShowEnrichment).toHaveBeenCalledTimes(1)
	})

	test('concurrent differing posters return the persisted winner and clean up the loser', async ({
		db,
	}) => {
		vi.mocked(createDb).mockReturnValue(db)
		vi.mocked(fetchShowEnrichment)
			.mockResolvedValueOnce(enrichmentFor(imageServerUrl))
			.mockResolvedValueOnce({
				...enrichmentFor(imageServerUrl),
				network: 'BBC',
				status: 'Running',
				airsDays: ['Friday'],
				airsTime: '10:00',
			})
		const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0xd9])
		vi.mocked(fetch)
			.mockResolvedValueOnce(
				new Response(PNG_BYTES, { headers: { 'content-type': 'image/png' } }),
			)
			.mockResolvedValueOnce(
				new Response(jpegBytes, { headers: { 'content-type': 'image/jpeg' } }),
			)

		const uploadedKeys: string[] = []
		let release = () => {}
		const ready = new Promise<void>((resolve) => {
			release = resolve
		})
		const concurrentStorage = {
			...storage,
			async put(key: string, body: Uint8Array, contentType: string) {
				await storage.put(key, body, contentType)
				uploadedKeys.push(key)
				if (uploadedKeys.length === 2) release()
				await ready
			},
		}
		vi.mocked(getStorage).mockReturnValue(concurrentStorage)
		const results = await Promise.all([
			getPosterImageBytes(CONCURRENT_ID),
			getPosterImageBytes(CONCURRENT_ID),
		])
		const rows = await db
			.select()
			.from(showImage)
			.where(eq(showImage.imdbId, CONCURRENT_ID))
		expect(rows).toHaveLength(1)
		const row = rows[0]!
		const isPng = row.contentType === 'image/png'
		expect(row.network).toBe(isPng ? 'HBO' : 'BBC')
		expect(row.objectKey).toMatch(new RegExp(`\\.${isPng ? 'png' : 'jpg'}$`))
		const stored = await storage.get(row.objectKey!)
		expect(stored?.contentType).toBe(row.contentType)
		expect(Buffer.from(stored!.data)).toEqual(isPng ? PNG_BYTES : jpegBytes)
		expect(results[0]).toEqual(results[1])
		expect(results[0]?.contentType).toBe(row.contentType)
		const loserKey = uploadedKeys.find((key) => key !== row.objectKey)!
		expect(await storage.get(loserKey)).toBeNull()
	})

	test('rejects unsafe poster URLs before downloading', async ({ db }) => {
		vi.mocked(createDb).mockReturnValue(db)
		vi.mocked(fetchShowEnrichment).mockResolvedValue(
			enrichmentFor('http://static.tvmaze.com/poster.png'),
		)
		await expect(getPosterImageBytes('tt44444444')).rejects.toThrow(
			'poster URL',
		)
		expect(fetch).not.toHaveBeenCalled()
	})

	test('a stale object read cannot delete a replacement row', async ({
		db,
	}) => {
		vi.mocked(createDb).mockReturnValue(db)
		const imdbId = STALE_ID
		await db
			.insert(showImage)
			.values({ imdbId, objectKey: 'thumbnails/stale.jpg' })
		const replacementKey = 'thumbnails/replacement.jpg'
		vi.mocked(getStorage).mockReturnValue({
			...storage,
			async get() {
				await db
					.update(showImage)
					.set({ objectKey: replacementKey })
					.where(eq(showImage.imdbId, imdbId))
				return null
			},
		})
		expect(await getPosterImageBytes(imdbId)).toBeNull()
		const [row] = await db
			.select()
			.from(showImage)
			.where(eq(showImage.imdbId, imdbId))
		expect(row?.objectKey).toBe(replacementKey)
	})

	test('a known-missing winner discards a concurrent poster upload', async ({
		db,
	}) => {
		vi.mocked(createDb).mockReturnValue(db)
		let releaseDownload = () => {}
		const resumeDownload = new Promise<void>((resolve) => {
			releaseDownload = resolve
		})
		let notifyStarted = () => {}
		const started = new Promise<void>((resolve) => {
			notifyStarted = resolve
		})
		vi.mocked(fetchShowEnrichment)
			.mockImplementationOnce(async () => {
				notifyStarted()
				await resumeDownload
				return enrichmentFor(imageServerUrl)
			})
			.mockResolvedValueOnce(null)
		imageBytes = PNG_BYTES
		const put = vi.spyOn(storage, 'put')
		const pending = getPosterImageBytes(MISSING_RACE_ID)
		await started
		expect(await getPosterImageBytes(MISSING_RACE_ID)).toBeNull()
		releaseDownload()
		expect(await pending).toBeNull()
		const [row] = await db
			.select()
			.from(showImage)
			.where(eq(showImage.imdbId, MISSING_RACE_ID))
		expect(row?.objectKey).toBeNull()
		expect(put).toHaveBeenCalledTimes(1)
		expect(await storage.get(put.mock.calls[0]![0])).toBeNull()
	})
})
