import { test } from '@config/test/browser'
import { routeComponent, searchResults } from '@tests/support/render/route'
import { renderVisualPage } from '@tests/support/render/visual-page'
import { http, HttpResponse } from 'msw'
import { expect } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'

import { Route as HomeRoute } from '@/routes/index'

test('home search and keyboard selection match screenshots', async ({
	worker,
}) => {
	worker.use(
		http.get('/api/suggestions', () => HttpResponse.json(searchResults)),
	)
	const visualPage = await renderVisualPage({
		path: '/',
		component: routeComponent(HomeRoute),
		waitFor: (screen) => screen.getByRole('heading', { name: /imdbgraph/i }),
	})
	await visualPage.expectScreenshot('home')
	await userEvent.fill(visualPage.screen.getByRole('combobox'), 'Ava')
	const first = visualPage.screen.getByRole('option', {
		name: /Avatar: The Last Airbender/i,
	})
	await expect.element(first).toHaveAttribute('aria-selected', 'true')
	await visualPage.expectScreenshot('home-search-avatar')

	await userEvent.keyboard('{ArrowDown}')
	await expect.element(first).toHaveAttribute('aria-selected', 'false')
	await expect
		.element(
			visualPage.screen.getByRole('option', { name: /Game of Thrones/i }),
		)
		.toHaveAttribute('aria-selected', 'true')
	await visualPage.expectScreenshot('home-keyboard-selection')
})
