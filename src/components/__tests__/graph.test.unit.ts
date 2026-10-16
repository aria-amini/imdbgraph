import { describe, expect, test } from 'vite-plus/test'

import { transformRatingsData } from '@/components/graph'
import {
	episodeSchema,
	seasonAverage,
	votedEpisodes,
} from '@/lib/imdb/episodes'
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

	test('spans each season average across its own episodes', () => {
		const { averages } = transformRatingsData(gameOfThronesRatings)

		expect(averages.map((season) => season.seasonNum)).toEqual([
			1, 2, 3, 4, 5, 6, 7, 8,
		])
		expect(averages[0]).toMatchObject({
			firstEpisodeIndex: 1,
			lastEpisodeIndex: 10,
		})
		expect(averages[1]?.firstEpisodeIndex).toBe(11)
		expect(averages.at(-1)?.lastEpisodeIndex).toBe(73)
	})
})

test('orders voted episodes and excludes unknown episode numbers', () => {
	const first = {
		...unratedEpisode,
		episodeId: 'tt1',
		episodeNum: 1,
		numVotes: 10,
		rating: 8,
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
		averages: [
			{
				seasonNum: 1,
				average: first.rating,
				firstEpisodeIndex: 1,
				lastEpisodeIndex: 2,
			},
		],
		data: [
			{ episodeIndex: 1, season1: first.rating, episode1: first },
			{ episodeIndex: 2, season1: third.rating, episode1: third },
		],
		averages: [
			{
				seasonNum: 1,
				average: first.rating,
				firstEpisodeIndex: 1,
				lastEpisodeIndex: 2,
			},
		],
	})
})

test('excludes episodes with out-of-range ratings', () => {
	const valid = {
		...unratedEpisode,
		episodeId: 'tt1',
		episodeNum: 1,
		numVotes: 10,
		rating: 8.5,
	}

	const below = { ...valid, episodeId: 'tt2', episodeNum: 2, rating: 0.5 }
	const above = { ...valid, episodeId: 'tt3', episodeNum: 3, rating: 10.5 }

	const ratings = {
		...gameOfThronesRatings,
		allEpisodeRatings: { 1: { 1: valid, 2: below, 3: above } },
	}

	expect(votedEpisodes(ratings, 1)).toEqual([valid])
	expect(episodeSchema.safeParse(valid).success).toBe(true)
	expect(episodeSchema.safeParse(below).success).toBe(false)
	expect(episodeSchema.safeParse(above).success).toBe(false)
})
