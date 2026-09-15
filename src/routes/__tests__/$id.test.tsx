import { test } from '@config/test/browser'
import type { ComponentType } from 'react'
import { vi } from 'vite-plus/test'

import { gameOfThronesRatings } from '@/mocks/data/game-of-thrones'
import { Route as RatingsRoute } from '@/routes/ratings/$id'

import { renderVisualPage } from '@tests/support/render/visual-page'

vi.mock('@/lib/imdb/ratings', () => ({
	getRatings: async () => gameOfThronesRatings,
}))

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

test('ratings page matches screenshot', async () => {
	vi.spyOn(RatingsRoute, 'useLoaderData').mockReturnValue(gameOfThronesRatings)

	const visualPage = await renderVisualPage({
		path: '/ratings/$id',
		component: routeComponent(RatingsRoute),
		waitFor: (screen) =>
			screen.getByRole('heading', { name: /game of thrones/i }),
	})

	await visualPage.expectScreenshot('ratings-game-of-thrones')
})
