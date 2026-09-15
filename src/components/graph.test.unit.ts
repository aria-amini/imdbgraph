import { describe, expect, test } from 'vitest'

import { transformRatingsData } from '@/components/graph'
import { votedEpisodes } from '@/lib/imdb/episodes'
import type { Episode } from '@/lib/imdb/types'
import { gameOfThronesRatings } from '@/mocks/data/game-of-thrones'

const unratedEpisode: Episode = {
	episodeId: 'tt9999999',
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

test('orders voted episodes and excludes unknown episode numbers', () => {
	const first = {
		...unratedEpisode,
		episodeId: 'tt1',
		episodeNum: 1,
		numVotes: 10,
	}
	const third = { ...first, episodeId: 'tt3', episodeNum: 3 }
	const unknown = { ...first, episodeId: 'tt0', episodeNum: 0 }
	const ratings = {
		...gameOfThronesRatings,
		allEpisodeRatings: {
			1: { 1: third, 2: unknown, 3: first, 4: unratedEpisode },
			2: {},
		},
	}
	expect(votedEpisodes(ratings, 1)).toEqual([first, third])
	expect(votedEpisodes(ratings, 3)).toEqual([])
	expect(transformRatingsData(ratings)).toEqual({
		seasons: [1, 2],
		data: [
			{ episodeIndex: 1, season1: first.rating, episode1: first },
			{ episodeIndex: 2, season1: third.rating, episode1: third },
		],
	})
})
