import { test } from '@config/test/browser'
import { http, HttpResponse } from 'msw'
import type { ComponentType } from 'react'
import { expect, vi } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'
import type { Locator } from 'vite-plus/test/browser'
import type { RenderResult } from 'vitest-browser-react'

import { shows } from '@/lib/imdb/__fixtures__/shows'
import { gameOfThronesRatings } from '@/mocks/data/game-of-thrones'
import { Route as HomeRoute } from '@/routes/index'
import { Route as RatingsRoute } from '@/routes/ratings/$id'

import {
	expectPageScreenshot,
	renderVisualPage,
} from './support/render/visual-page'

vi.mock('@/lib/imdb/ratings', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/lib/imdb/ratings')>()),
	getRatings: async () => gameOfThronesRatings,
}))

interface PageScreenshotCase {
	name: string
	path: string
	component: ComponentType
	waitFor: (screen: RenderResult) => Locator
	setup?: () => void | Promise<void>
	viewport?: { width: number; height: number }
}

const pages = [
	{
		name: 'ratings-game-of-thrones',
		path: '/ratings/$id',
		component: RatingsRoute.options.component as ComponentType,
		waitFor: (screen) =>
			screen.getByRole('heading', { name: /game of thrones/i }),
		setup: () => {
			;(
				RatingsRoute as unknown as { useLoaderData: () => unknown }
			).useLoaderData = () => gameOfThronesRatings
		},
	},
	{
		name: 'ratings-game-of-thrones-mobile',
		path: '/ratings/$id',
		component: RatingsRoute.options.component as ComponentType,
		waitFor: (screen) =>
			screen.getByRole('heading', { name: /game of thrones/i }),
		viewport: { width: 375, height: 812 },
		setup: () => {
			;(
				RatingsRoute as unknown as { useLoaderData: () => unknown }
			).useLoaderData = () => gameOfThronesRatings
		},
	},
] satisfies PageScreenshotCase[]

test.each(pages)(
	'$name page matches desktop screenshot',
	async (visualPage) => {
		await expectPageScreenshot(visualPage)
	},
)

test('home page search interaction matches desktop screenshots', async ({
	worker,
}) => {
	const searchResultIds = [
		'tt0417299',
		'tt0944947',
		'tt0903747',
		'tt11126994',
		'tt0306414',
	]

	const searchResults = searchResultIds.map((imdbId) => {
		const show = shows.find((fixture) => fixture.imdbId === imdbId)
		if (!show) {
			throw new Error(`Search result fixture not found: ${imdbId}`)
		}

		return show
	})

	worker.use(
		http.get('/api/suggestions', () => {
			return HttpResponse.json(searchResults)
		}),
	)

	const visualPage = await renderVisualPage({
		path: '/',
		component: HomeRoute.options.component as ComponentType,
		waitFor: (screen) => screen.getByRole('heading', { name: /imdbgraph/i }),
	})

	await visualPage.expectScreenshot('home', { soft: true })

	const searchBar = visualPage.screen.getByRole('combobox')
	await userEvent.fill(searchBar, 'Ava')
	const avatarResult = visualPage.screen.getByText(
		/Avatar: The Last Airbender/i,
	)
	await expect.element(avatarResult).toBeVisible()
	avatarResult.element().scrollIntoView({ block: 'nearest' })

	await visualPage.expectScreenshot('home-search-avatar', { soft: true })
})
