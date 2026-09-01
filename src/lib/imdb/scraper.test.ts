import { scrapeRun } from '@/db/tables'
import { downloadStream, type ImdbFile } from '@/lib/imdb/file-downloader'
import { getRatingsDb } from '@/lib/imdb/ratings'
import type { Ratings } from '@/lib/imdb/types'
import { getLatestScrapeRunDb } from '@/lib/imdb/scrape-run'
import { update } from '@/lib/imdb/scraper'
import { initDb } from '@config/test/db'
import { createReadStream } from 'node:fs'
import path from 'node:path'
import { describe, expect, vi } from 'vitest'

vi.mock(import('@/lib/imdb/file-downloader'))

const GAME_OF_THRONES_ID = 'tt0944947'
const SIMPSONS_ID = 'tt0096697'

const expectedGameOfThronesRatings: Ratings = {
	allEpisodeRatings: {
		1: {
			1: {
				episodeNum: 1,
				numVotes: 36939,
				rating: 9.1,
				seasonNum: 1,
				title: 'Winter Is Coming',
			},
			2: {
				episodeNum: 2,
				numVotes: 27976,
				rating: 8.8,
				seasonNum: 1,
				title: 'The Kingsroad',
			},
			3: {
				episodeNum: 3,
				numVotes: 26458,
				rating: 8.7,
				seasonNum: 1,
				title: 'Lord Snow',
			},
		},
		2: {
			1: {
				episodeNum: 1,
				numVotes: 23735,
				rating: 8.9,
				seasonNum: 2,
				title: 'The North Remembers',
			},
			2: {
				episodeNum: 2,
				numVotes: 22413,
				rating: 8.6,
				seasonNum: 2,
				title: 'The Night Lands',
			},
		},
	},
	show: {
		endYear: '2019',
		imdbId: 'tt0944947',
		numVotes: 1563413,
		rating: 9.4,
		startYear: '2011',
		title: 'Game of Thrones',
	},
}

// =============================================================================
// Tests
// =============================================================================
describe('scraper tests', () => {
	const test = initDb(() => {})

	test('loading sample files into database', async ({ db }) => {
		await db.delete(scrapeRun)

		mockDownloads({
			'title.basics.tsv.gz': './__fixtures__/titles.tsv',
			'title.episode.tsv.gz': './__fixtures__/episodes.tsv',
			'title.ratings.tsv.gz': './__fixtures__/ratings.tsv',
		})

		await update(db)

		expect(await getRatingsDb(db, GAME_OF_THRONES_ID)).toEqual(
			expectedGameOfThronesRatings,
		)
		expect(await getRatingsDb(db, SIMPSONS_ID)).toBeUndefined()

		const latestScrapeRun = await getLatestScrapeRunDb(db)
		expect(latestScrapeRun).toEqual(expect.any(String))
		expect(Number.isNaN(Date.parse(latestScrapeRun as string))).toBe(false)
		expect(await db.select().from(scrapeRun)).toHaveLength(1)
	})

	test('getting the latest scrape run', async ({ db }) => {
		await db.delete(scrapeRun)

		await db
			.insert(scrapeRun)
			.values([
				{ completedAt: new Date('2026-01-01T00:00:00.000Z') },
				{ completedAt: new Date('2026-01-02T00:00:00.000Z') },
			])

		expect(await getLatestScrapeRunDb(db)).toBe('2026-01-02T00:00:00.000Z')
	})

	test('handling bad files', async ({ db }) => {
		await db.delete(scrapeRun)

		mockDownloads({
			'title.basics.tsv.gz': './__fixtures__/titles.tsv',
			'title.episode.tsv.gz': './__fixtures__/bad-episodes.tsv',
			'title.ratings.tsv.gz': './__fixtures__/ratings.tsv',
		})
		await expect(update(db)).rejects.toThrow(
			'invalid input syntax for type integer: "5   corrupt-data 1212"',
		)
		expect(await getLatestScrapeRunDb(db)).toBeNull()
	})
})

// =============================================================================
// Helpers
// =============================================================================
function mockDownloads(mockedFiles: Record<ImdbFile, string>) {
	vi.mocked(downloadStream).mockImplementation(async (imdbFile) => {
		const input = path.join(import.meta.dirname, mockedFiles[imdbFile])
		return createReadStream(input)
	})
}
