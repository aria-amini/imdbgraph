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
		genres: null,
		runtimeMinutes: null,
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

		await waitForAnimationFrames()

		await expect.element(chart).toBeVisible()
	}, 5_000)

	test('chart stays responsive after viewport resize', async () => {
		const screen = await render(<Graph ratings={ratings} />)

		const chart = screen.getByTestId('ratings-graph')
		await expect.element(chart).toBeVisible()
		const chartSvg = document.querySelector(
			'[data-testid="ratings-graph"] svg.recharts-surface',
		)
		if (!(chartSvg instanceof SVGSVGElement)) {
			throw new Error('Chart SVG not found')
		}
		const initialWidth = chartSvg.getAttribute('width')

		const originalWidth = window.innerWidth
		const originalHeight = window.innerHeight
		try {
			await page.viewport(390, 844)
			await waitForAnimationFrames()
			expect(chartSvg.getAttribute('width')).not.toBe(initialWidth)
			expect(Number(chartSvg.getAttribute('width'))).toBeGreaterThan(0)
			await expect.element(chartSvg).toHaveAttribute('height', '260')
		} finally {
			await page.viewport(originalWidth, originalHeight)
		}
	}, 5_000)
})

function waitForAnimationFrames() {
	return new Promise<void>((resolve) => {
		requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
	})
}
