import { test } from '@config/test/browser'
import { routeComponent, searchResults } from '@tests/support/render/route'
import { renderVisualPage } from '@tests/support/render/visual-page'
import { http, HttpResponse } from 'msw'
import { expect, vi } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'

import { gameOfThronesRatings } from '@/mocks/data/game-of-thrones'
import { Route as RatingsRoute } from '@/routes/ratings/$id'

vi.mock('@/lib/imdb/ratings', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/lib/imdb/ratings')>()),
	getRatings: async () => gameOfThronesRatings,
}))

async function renderRatings() {
	vi.spyOn(RatingsRoute, 'useLoaderData').mockReturnValue({
		ratings: gameOfThronesRatings,
	})
	const visualPage = await renderVisualPage({
		path: '/ratings/$id',
		component: routeComponent(RatingsRoute),
		waitFor: (screen) =>
			screen.getByRole('heading', { name: /game of thrones/i }),
	})
	await expect
		.element(visualPage.screen.getByText('Poster unavailable'))
		.toBeInTheDocument()
	return visualPage
}

test.each(['light', 'dark'] as const)(
	'ratings blocks and graph in %s theme',
	async (theme) => {
		const visualPage = await renderRatings()
		document.documentElement.classList.toggle('dark', theme === 'dark')
		const blocks = visualPage.screen.getByRole('button', {
			name: 'blocks',
			exact: true,
		})
		const graph = visualPage.screen.getByRole('button', {
			name: 'graph',
			exact: true,
		})
		await expect.element(blocks).toHaveAttribute('aria-pressed', 'true')
		await expect
			.element(visualPage.screen.getByTestId('ratings-block'))
			.toBeVisible()
		await visualPage.expectScreenshot(
			theme === 'light' ? 'ratings-game-of-thrones' : 'ratings-blocks-dark',
		)
		await userEvent.click(graph)
		await expect.element(graph).toHaveAttribute('aria-pressed', 'true')
		await expect
			.element(visualPage.screen.getByTestId('ratings-graph'))
			.toBeVisible()
		await expect
			.element(visualPage.screen.getByTestId('ratings-block'))
			.not.toBeInTheDocument()
		await visualPage.expectScreenshot(`ratings-graph-${theme}`)
		await userEvent.click(blocks)
		await expect
			.element(visualPage.screen.getByTestId('ratings-block'))
			.toBeVisible()
	},
)

test('ratings search dropdown matches screenshot', async ({ worker }) => {
	worker.use(
		http.get('/api/suggestions', () => HttpResponse.json(searchResults)),
	)
	const visualPage = await renderRatings()
	await userEvent.fill(visualPage.screen.getByRole('combobox'), 'Ava')
	await expect
		.element(
			visualPage.screen.getByRole('option', {
				name: /Avatar: The Last Airbender/i,
			}),
		)
		.toHaveAttribute('aria-selected', 'true')
	await visualPage.expectScreenshot('ratings-focused')
})
