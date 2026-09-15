import { test } from '@config/test/browser'
import { http, HttpResponse } from 'msw'
import type { ComponentType } from 'react'
import { expect } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'

import { shows } from '@/lib/imdb/__fixtures__/shows'
import { Route as HomeRoute } from '@/routes/index'

import { renderVisualPage } from '@tests/support/render/visual-page'

function routeComponent({
	options,
}: {
	options: { component?: ComponentType }
}): ComponentType {
	const { component } = options
	if (!component) {
		throw new Error('Route has no component')
	}
	return component
}

const searchResults = [
	'tt0417299',
	'tt0944947',
	'tt0903747',
	'tt11126994',
	'tt0306414',
].map((imdbId) => {
	const show = shows.find((fixture) => fixture.imdbId === imdbId)
	if (!show) {
		throw new Error(`Search result fixture not found: ${imdbId}`)
	}

	return show
})

test('home page search interaction matches screenshots', async ({
	worker,
}) => {
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
