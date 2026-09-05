import { describe, expect, test } from '@config/test/browser'
import { render } from 'vitest-browser-react'
import { page } from 'vitest/browser'

import type { Ratings } from '@/lib/imdb/types'

import { Graph } from './graph'

const ratings: Ratings = {
	show: {
		imdbId: 'tt0000001',
		title: 'Test Show',
		startYear: '2020',
		endYear: null,
		rating: 8,
		numVotes: 100,
	},
	allEpisodeRatings: {
		1: {
			1: {
				title: 'Episode One',
				seasonNum: 1,
				episodeNum: 1,
				rating: 7,
				numVotes: 10,
			},
			2: {
				title: 'Episode Two',
				seasonNum: 1,
				episodeNum: 2,
				rating: 8,
				numVotes: 11,
			},
			3: {
				title: 'Episode Three',
				seasonNum: 1,
				episodeNum: 3,
				rating: 9,
				numVotes: 12,
			},
		},
	},
}

describe('graph tests', () => {
	test('chart stays responsive after mount', async () => {
		const screen = await render(<Graph ratings={ratings} />)

		const chart = screen.getByTestId('ratings-graph')
		await expect.element(chart).toBeVisible()

		await new Promise((resolve) => setTimeout(resolve, 3_000))

		await expect.element(chart).toBeVisible()
	}, 20_000)

	test('chart stays responsive after viewport resize', async () => {
		const screen = await render(<Graph ratings={ratings} />)

		const chart = screen.getByTestId('ratings-graph')
		await expect.element(chart).toBeVisible()

		const originalWidth = window.innerWidth
		const originalHeight = window.innerHeight
		try {
			await page.viewport(390, 844)
			await new Promise((resolve) => setTimeout(resolve, 3_000))
			await expect.element(chart).toBeVisible()
		} finally {
			await page.viewport(originalWidth, originalHeight)
		}
	}, 20_000)
})
