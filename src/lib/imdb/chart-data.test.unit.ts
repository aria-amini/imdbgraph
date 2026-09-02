import { describe, expect, test } from 'vitest'

import { transformRatingsData } from '@/lib/imdb/chart-data'
import type { Episode } from '@/lib/imdb/types'
import { gameOfThronesRatings } from '@/mocks/data/game-of-thrones'

const unratedEpisode: Episode = {
	title: 'Unrated Episode',
	seasonNum: 1,
	episodeNum: 11,
	numVotes: 0,
	rating: 0,
}

const ratingsWithUnratedEpisode = {
	...gameOfThronesRatings,
	allEpisodeRatings: {
		...gameOfThronesRatings.allEpisodeRatings,
		1: {
			...gameOfThronesRatings.allEpisodeRatings[1]!,
			11: unratedEpisode,
		},
	},
}

describe('chart data', () => {
	test('preserves seasons and skips unrated episodes', () => {
		const result = transformRatingsData(ratingsWithUnratedEpisode)

		expect(result.seasons).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
		expect(result.data).toHaveLength(73)
		expect(result.data[0]).toMatchObject({
			episodeIndex: 1,
			season1: 8.9,
		})
		expect(result.data.at(-1)).toMatchObject({
			episodeIndex: 73,
			season8: 4,
		})
		expect(result.data.some((point) => point.episode1 === unratedEpisode)).toBe(
			false,
		)
	})
})
