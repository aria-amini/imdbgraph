import { describe, expect, test } from 'vite-plus/test'

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
		const series = transformRatingsData(ratingsWithUnratedEpisode)
		const points = series.flatMap((season) => season.points)

		expect(series.map((season) => season.seasonNum)).toEqual([
			1, 2, 3, 4, 5, 6, 7, 8,
		])
		expect(points).toHaveLength(73)
		expect(points[0]).toMatchObject({
			episodeIndex: 1,
			episode: { seasonNum: 1, rating: 8.9 },
		})
		expect(points.at(-1)).toMatchObject({
			episodeIndex: 73,
			episode: { seasonNum: 8, rating: 4 },
		})
		expect(points.some((point) => point.episode === unratedEpisode)).toBe(false)
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
	expect(transformRatingsData(ratings)).toEqual([
		{
			seasonNum: 1,
			points: [
				{ episodeIndex: 1, episode: first },
				{ episodeIndex: 2, episode: third },
			],
		},
		{ seasonNum: 2, points: [] },
	])
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
})
