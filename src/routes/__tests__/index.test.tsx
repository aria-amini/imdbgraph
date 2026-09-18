import { test } from '@config/test/browser'
import { routeComponent, searchResults } from '@tests/support/render/route'
import { renderVisualPage } from '@tests/support/render/visual-page'
import { http, HttpResponse } from 'msw'
import { expect } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'

import { Route as HomeRoute } from '@/routes/index'

test('home page search interaction matches screenshots', async ({ worker }) => {
	worker.use(
		http.get('/api/suggestions', () => {
			return HttpResponse.json(searchResults)
		}),
	)

	const visualPage = await renderVisualPage({
		path: '/',
		component: routeComponent(HomeRoute),
		waitFor: (screen) => screen.getByRole('heading', { name: /imdbgraph/i }),
	})

	await visualPage.expectScreenshot('home')

	const searchBar = visualPage.screen.getByRole('combobox')
	await userEvent.fill(searchBar, 'Ava')
	const avatarResult = visualPage.screen.getByText(
		/Avatar: The Last Airbender/i,
	)
	await expect.element(avatarResult).toBeVisible()
	avatarResult.element().scrollIntoView({ block: 'nearest' })

	await visualPage.expectScreenshot('home-search-avatar')
})
