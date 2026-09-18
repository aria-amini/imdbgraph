import { test } from '@config/test/browser'
import { routeComponent, searchResults } from '@tests/support/render/route'
import { renderVisualPage } from '@tests/support/render/visual-page'
import { http, HttpResponse } from 'msw'
import { expect, vi } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'

import type { Theme } from '@/lib/theme'
import { gameOfThronesRatings } from '@/mocks/data/game-of-thrones'
import { Route as RatingsRoute } from '@/routes/ratings/$id'

vi.mock('@/lib/imdb/ratings', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/lib/imdb/ratings')>()),
	getRatings: async () => gameOfThronesRatings,
}))

async function renderRatings(theme: Theme = 'light') {
	vi.spyOn(RatingsRoute, 'useLoaderData').mockReturnValue({
		ratings: gameOfThronesRatings,
	})
	const visualPage = await renderVisualPage({
		path: '/ratings/$id',
		component: routeComponent(RatingsRoute),
		theme,
		waitFor: (screen) =>
			screen.getByRole('heading', { name: /game of thrones/i }),
	})
	await expect
		.element(visualPage.screen.getByText('Poster unavailable'))
		.toBeInTheDocument()
	return visualPage
}

test('self-heals the poster after a failure', async ({ worker }) => {
	const nextRatings = {
		...gameOfThronesRatings,
		show: {
			...gameOfThronesRatings.show,
			imdbId: 'tt9999999',
			title: 'Next show',
		},
	}
	worker.use(
		http.get('/api/thumbnails/:imdbId', ({ params }) => {
			if (params.imdbId !== nextRatings.show.imdbId) {
				return new HttpResponse(null, { status: 404 })
			}
			return new HttpResponse(
				'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="30"><rect width="20" height="30" fill="blue"/></svg>',
				{ headers: { 'Content-Type': 'image/svg+xml' } },
			)
		}),
	)
	const visualPage = await renderRatings()
	vi.spyOn(RatingsRoute, 'useLoaderData').mockReturnValue({
		ratings: nextRatings,
	})
	const Component = routeComponent(RatingsRoute)
	await visualPage.screen.rerender(<Component />)

	const poster = visualPage.screen.getByRole('img', {
		name: 'Next show poster',
	})
	await expect.element(poster).toBeVisible()
	await expect
		.poll(() => {
			const image = poster.element()
			return image instanceof HTMLImageElement ? image.naturalWidth : 0
		})
		.toBeGreaterThan(0)
	await expect
		.element(visualPage.screen.getByText('Poster unavailable'))
		.not.toBeInTheDocument()
})

for (const theme of ['light', 'dark'] as const) {
	test(`ratings blocks and graph in ${theme} theme`, async () => {
		const visualPage = await renderRatings(theme)
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
		await visualPage.expectScreenshot(`ratings-blocks-${theme}`)
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
	})
}

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
