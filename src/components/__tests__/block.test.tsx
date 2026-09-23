import { expect, test } from '@config/test/browser'
import { page, userEvent } from 'vite-plus/test/browser'
import { render } from 'vitest-browser-react'

import { Block } from '@/components/block'
import { gameOfThronesRatings } from '@/mocks/data/game-of-thrones'

// The first/last tiles in a wrapped row must keep their episode titles readable.
test('episode tooltips stay inside a narrow viewport', async () => {
	const original = { width: window.innerWidth, height: window.innerHeight }
	try {
		await page.viewport(320, 800)
		const screen = await render(<Block ratings={gameOfThronesRatings} />)
		const links = screen.getByRole('link')
		for (const index of [0, 4]) {
			await userEvent.hover(links.nth(index))
			const tooltip = page.getByTestId('episode-tooltip')
			await expect.element(tooltip).toBeVisible()
			await expect
				.poll(() => {
					const rect = tooltip.element().getBoundingClientRect()
					return rect.left >= 0 && rect.right <= window.innerWidth
				})
				.toBe(true)
		}
	} finally {
		await page.viewport(original.width, original.height)
	}
})

test('episode bars show exact ratings and compare their heights', async () => {
	const screen = await render(<Block ratings={gameOfThronesRatings} />)
	const episodes = Object.values(
		gameOfThronesRatings.allEpisodeRatings[1] ?? {},
	)
		.filter((episode) => episode.numVotes > 0)
		.sort((a, b) => a.rating - b.rating)
	const lowest = episodes[0]!
	const highest = episodes.at(-1)!
	const lowLink = screen.getByRole('link', {
		name: new RegExp(`Season 1, episode ${lowest.episodeNum}:`),
	})
	const highLink = screen.getByRole('link', {
		name: new RegExp(`Season 1, episode ${highest.episodeNum}:`),
	})

	await expect.element(lowLink).toHaveTextContent(lowest.rating.toFixed(1))
	await expect.element(highLink).toHaveTextContent(highest.rating.toFixed(1))
	await expect
		.poll(() => {
			const lowBar = lowLink.element().querySelector('[style*="height"]')
			const highBar = highLink.element().querySelector('[style*="height"]')
			return (
				(highBar?.getBoundingClientRect().height ?? 0) >
				(lowBar?.getBoundingClientRect().height ?? 0)
			)
		})
		.toBe(true)
})
