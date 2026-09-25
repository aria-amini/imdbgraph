import { desktopTest, test } from '@config/test/browser'
import { routeComponent, searchResults } from '@tests/support/render/route'
import { renderVisualPage } from '@tests/support/render/visual-page'
import { http, HttpResponse } from 'msw'
import { expect, vi } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'

import { Route as SearchRoute } from '@/routes/search'

test('search results page matches screenshot', async () => {
	vi.spyOn(SearchRoute, 'useLoaderData').mockReturnValue({
		query: 'avatar',
		results: searchResults,
	})

	const visualPage = await renderVisualPage({
		path: '/search',
		component: routeComponent(SearchRoute),
		waitFor: (screen) =>
			screen.getByRole('heading', { name: /search results/i }),
	})

	await expect
		.element(visualPage.screen.getByText(/Avatar: The Last Airbender/i))
		.toBeVisible()
	await visualPage.expectScreenshot('search-avatar')
})

desktopTest(
	'navbar search opens suggestions on the search results page',
	async ({ worker }) => {
		worker.use(
			http.get('/api/suggestions', () => HttpResponse.json(searchResults)),
		)
		vi.spyOn(SearchRoute, 'useLoaderData').mockReturnValue({
			query: 'avatar',
			results: searchResults,
		})

		const visualPage = await renderVisualPage({
			path: '/search',
			component: routeComponent(SearchRoute),
			waitFor: (screen) =>
				screen.getByRole('heading', { name: /search results/i }),
		})

		await userEvent.fill(visualPage.screen.getByRole('combobox'), 'Ava')
		await expect
			.element(
				visualPage.screen.getByRole('option', {
					name: /Avatar: The Last Airbender/i,
				}),
			)
			.toBeVisible()
		await visualPage.expectScreenshot('search-navbar-suggestions')
	},
)
