import {
	parseEpisodeLine,
	parseRatingsLine,
	shouldCopyTitle,
} from '@/lib/imdb/scraper-filter'
import { describe, expect, test } from 'vitest'

describe('scraper filtering', () => {
	test('collects rated identifiers and episode show identifiers', () => {
		expect(parseRatingsLine('tt1234567\t8.1\t42')).toEqual({
			imdbId: 'tt1234567',
			numVotes: 42,
		})
		expect(parseEpisodeLine('tt7654321\ttt1234567\t1\t2')).toEqual({
			episodeId: 'tt7654321',
			showId: 'tt1234567',
		})
	})

	test('keeps rated episodes and eligible shows only', () => {
		const ratedIds = new Set(['tt7654321'])
		const showIds = new Set(['tt1234567'])
		expect(
			shouldCopyTitle(
				'tt7654321\ttvEpisode\tEpisode\tEpisode\t0\t2020',
				ratedIds,
				showIds,
			),
		).toBe(true)
		expect(
			shouldCopyTitle(
				'tt1234567\ttvSeries\tShow\tShow\t0\t2020',
				ratedIds,
				showIds,
			),
		).toBe(true)
		expect(
			shouldCopyTitle(
				'tt9999999\ttvSeries\tShow\tShow\t0\t2020',
				ratedIds,
				showIds,
			),
		).toBe(false)
	})
})
