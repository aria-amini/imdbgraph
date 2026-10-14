import { describe, expect, test } from 'vite-plus/test'

import { seasonAverage, votedEpisodes } from '@/lib/imdb/episodes'
import { gameOfThronesRatings } from '@/mocks/data/game-of-thrones'

describe('seasonAverage', () => {
	test('returns null for a season without episodes', () => {
		expect(seasonAverage([])).toBeNull()
	})

	test('returns the unweighted mean of episode ratings', () => {
		const episodes = votedEpisodes(gameOfThronesRatings, 1)

		const expected =
			episodes.reduce((sum, episode) => sum + episode.rating, 0) /
			episodes.length

		expect(seasonAverage(episodes)).toBeCloseTo(expected, 10)
		expect(seasonAverage(episodes)).toBeGreaterThan(1)
		expect(seasonAverage(episodes)).toBeLessThanOrEqual(10)
	})
})
