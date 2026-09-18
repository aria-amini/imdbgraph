import { test } from '@config/test/browser'
import { routeComponent, searchResults } from '@tests/support/render/route'
import { renderVisualPage } from '@tests/support/render/visual-page'
import { expect, vi } from 'vite-plus/test'

import { Route as SearchRoute } from '@/routes/search/$query'

test('search results page matches screenshot', async () => {
	vi.spyOn(SearchRoute, 'useLoaderData').mockReturnValue({
		query: 'avatar',
		results: searchResults,
	})
	const visualPage = await renderVisualPage({
		path: '/search/$query',
		component: routeComponent(SearchRoute),
		waitFor: (screen) =>
			screen.getByRole('heading', { name: /search results/i }),
	})
	await expect
		.element(visualPage.screen.getByText(/Avatar: The Last Airbender/i))
		.toBeVisible()
	await visualPage.expectScreenshot('search-avatar')
})
