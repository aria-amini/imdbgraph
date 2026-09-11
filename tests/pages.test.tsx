import { test } from '@config/test/browser'
import { http, HttpResponse } from 'msw'
import type { SetupWorker } from 'msw/browser'
import type { ComponentType } from 'react'
import { expect, vi } from 'vite-plus/test'
import { userEvent } from 'vite-plus/test/browser'
import type { Locator } from 'vite-plus/test/browser'
import type { RenderResult } from 'vitest-browser-react'

import { shows } from '@/lib/imdb/__fixtures__/shows'
import { gameOfThronesRatings } from '@/mocks/data/game-of-thrones'
import { Route as HomeRoute } from '@/routes/index'
import { Route as RatingsRoute } from '@/routes/ratings/$id'
import { Route as SearchRoute } from '@/routes/search/$query'

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

function stubLoaderData<TRoute extends { useLoaderData: () => unknown }>(
	route: TRoute,
	data: ReturnType<TRoute['useLoaderData']>,
) {
	Object.assign(route, { useLoaderData: () => data })
}

const pages = [
	{
		name: 'ratings-game-of-thrones',
		path: '/ratings/$id',
		component: routeComponent(RatingsRoute),
		waitFor: (screen) =>
			screen.getByRole('heading', { name: /game of thrones/i }),
		setup: () => {
			stubLoaderData(RatingsRoute, {
				ratings: gameOfThronesRatings,
			})
		},
	},
] satisfies PageScreenshotCase[]

test.each(pages)('$name page matches screenshot', async (visualPage) => {
	await expectPageScreenshot(visualPage)
})

const searchResultIds = [
	'tt0417299',
	'tt0944947',
	'tt0903747',
	'tt11126994',
	'tt0306414',
]

function mockSuggestions(worker: SetupWorker) {
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
}

function searchResultsFixture() {
	return searchResultIds.map((imdbId) => {
		const show = shows.find((fixture) => fixture.imdbId === imdbId)
		if (!show) {
			throw new Error(`Search result fixture not found: ${imdbId}`)
		}

		return show
	})
}

test('home page search interaction matches desktop screenshots', async ({
	worker,
}) => {
	mockSuggestions(worker)

	const visualPage = await renderVisualPage({
		path: '/',
		component: routeComponent(HomeRoute),
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

test('home page search interaction matches mobile screenshots', async ({
	worker,
}) => {
	mockSuggestions(worker)

	const visualPage = await renderVisualPage({
		path: '/',
		component: routeComponent(HomeRoute),
		waitFor: (screen) => screen.getByRole('heading', { name: /imdbgraph/i }),
		viewport: { width: 375, height: 812 },
	})

	await visualPage.expectScreenshot('home-mobile', { soft: true })

	const searchBar = visualPage.screen.getByRole('combobox')
	await userEvent.fill(searchBar, 'Ava')
	const avatarResult = visualPage.screen.getByText(
		/Avatar: The Last Airbender/i,
	)
	await expect.element(avatarResult).toBeVisible()
	avatarResult.element().scrollIntoView({ block: 'nearest' })

	await visualPage.expectScreenshot('home-search-avatar-mobile', {
		soft: true,
	})
})

test('home page searchbar focused with results matches desktop screenshot', async ({
	worker,
}) => {
	mockSuggestions(worker)

	const visualPage = await renderVisualPage({
		path: '/',
		component: routeComponent(HomeRoute),
		waitFor: (screen) => screen.getByRole('heading', { name: /imdbgraph/i }),
		prepare: async (screen) => {
			await userEvent.fill(screen.getByRole('combobox'), 'Ava')
			await expect
				.element(screen.getByText(/Avatar: The Last Airbender/i))
				.toBeVisible()
		},
	})

	await visualPage.expectScreenshot('home-focused', { soft: true })
})

test('home page searchbar focused with results matches mobile screenshot', async ({
	worker,
}) => {
	mockSuggestions(worker)

	const visualPage = await renderVisualPage({
		path: '/',
		component: routeComponent(HomeRoute),
		waitFor: (screen) => screen.getByRole('heading', { name: /imdbgraph/i }),
		viewport: { width: 375, height: 812 },
		prepare: async (screen) => {
			await userEvent.fill(screen.getByRole('combobox'), 'Ava')
			await expect
				.element(screen.getByText(/Avatar: The Last Airbender/i))
				.toBeVisible()
		},
	})

	await visualPage.expectScreenshot('home-focused-mobile', { soft: true })
})

test('home page keyboard navigation matches desktop screenshot', async ({
	worker,
}) => {
	mockSuggestions(worker)

	const visualPage = await renderVisualPage({
		path: '/',
		component: routeComponent(HomeRoute),
		waitFor: (screen) => screen.getByRole('heading', { name: /imdbgraph/i }),
		prepare: async (screen) => {
			await userEvent.fill(screen.getByRole('combobox'), 'Ava')
			await expect
				.element(screen.getByText(/Avatar: The Last Airbender/i))
				.toBeVisible()
		},
	})

	await expect
		.element(
			visualPage.screen
				.getByRole('option', { name: /Avatar: The Last Airbender/i })
				.first(),
		)
		.toHaveAttribute('aria-selected', 'true')
	await visualPage.expectScreenshot('home-keyboard-selection', { soft: true })
})

test('search results page matches desktop screenshot', async () => {
	const visualPage = await renderVisualPage({
		path: '/search/$query',
		component: routeComponent(SearchRoute),
		waitFor: (screen) =>
			screen.getByRole('heading', { name: /search results/i }),
		setup: () => {
			stubLoaderData(SearchRoute, {
				query: 'avatar',
				results: searchResultsFixture(),
			})
		},
	})

	await expect
		.element(visualPage.screen.getByText(/Avatar: The Last Airbender/i))
		.toBeVisible()
	await visualPage.expectScreenshot('search-avatar', { soft: true })
})

test('search results page matches mobile screenshot', async () => {
	const visualPage = await renderVisualPage({
		path: '/search/$query',
		component: routeComponent(SearchRoute),
		waitFor: (screen) =>
			screen.getByRole('heading', { name: /search results/i }),
		viewport: { width: 375, height: 812 },
		setup: () => {
			stubLoaderData(SearchRoute, {
				query: 'avatar',
				results: searchResultsFixture(),
			})
		},
	})

	await expect
		.element(visualPage.screen.getByText(/Avatar: The Last Airbender/i))
		.toBeVisible()
	await visualPage.expectScreenshot('search-avatar-mobile', { soft: true })
})

test('ratings page searchbar focused with results matches desktop screenshot', async ({
	worker,
}) => {
	mockSuggestions(worker)

	const visualPage = await renderVisualPage({
		path: '/ratings/$id',
		component: routeComponent(RatingsRoute),
		waitFor: (screen) =>
			screen.getByRole('heading', { name: /game of thrones/i }),
		setup: () => {
			stubLoaderData(RatingsRoute, {
				ratings: gameOfThronesRatings,
			})
		},
		prepare: async (screen) => {
			await userEvent.fill(screen.getByRole('combobox'), 'Ava')
			await expect
				.element(screen.getByText(/Avatar: The Last Airbender/i))
				.toBeVisible()
		},
	})

	await visualPage.expectScreenshot('ratings-focused', { soft: true })
})

test('ratings page searchbar focused with results matches mobile screenshot', async ({
	worker,
}) => {
	mockSuggestions(worker)

	const visualPage = await renderVisualPage({
		path: '/ratings/$id',
		component: routeComponent(RatingsRoute),
		waitFor: (screen) =>
			screen.getByRole('heading', { name: /game of thrones/i }),
		viewport: { width: 375, height: 812 },
		setup: () => {
			stubLoaderData(RatingsRoute, {
				ratings: gameOfThronesRatings,
			})
		},
		prepare: async (screen) => {
			await userEvent.fill(screen.getByRole('combobox'), 'Ava')
			await expect
				.element(screen.getByText(/Avatar: The Last Airbender/i))
				.toBeVisible()
		},
	})

	await visualPage.expectScreenshot('ratings-focused-mobile', { soft: true })
})
