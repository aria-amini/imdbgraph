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
