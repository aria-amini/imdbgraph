import { test } from '@config/test/browser'
import { routeComponent } from '@tests/support/render/route'
import { renderVisualPage } from '@tests/support/render/visual-page'
import { vi } from 'vite-plus/test'

import { gameOfThronesRatings } from '@/mocks/data/game-of-thrones'
import { Route as RatingsRoute } from '@/routes/ratings/$id'

vi.mock('@/lib/imdb/ratings', () => ({
	getRatings: async () => gameOfThronesRatings,
}))

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
