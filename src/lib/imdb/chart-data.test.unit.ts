import { transformRatingsData } from '@/lib/imdb/chart-data'
import { gameOfThronesRatings } from '@/mocks/data/game-of-thrones'
import { describe, expect, test } from 'vitest'

describe('chart data', () => {
	test('preserves seasons and skips unrated episodes', () => {
		const result = transformRatingsData(gameOfThronesRatings)

		expect(result.seasons).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
		expect(result.data[0]).toMatchObject({
			episodeIndex: 1,
			season1: 8.9,
		})
	})
})
