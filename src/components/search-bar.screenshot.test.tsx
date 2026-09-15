import { test, expect, describe, afterEach } from '@config/test/browser'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
	createRootRoute,
	createRoute,
	createRouter,
	RouterContextProvider,
	type AnyRouter,
} from '@tanstack/react-router'
import {
	expectElementScreenshot,
	resizeScreenshotViewport,
} from '@tests/support/render/visual-page'
import { http, HttpResponse } from 'msw'
import { page, server, userEvent } from 'vite-plus/test/browser'
import { render } from 'vitest-browser-react'

import { shows } from '@/lib/imdb/__fixtures__/shows'

import { SearchBar } from './search-bar'

const testQueryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: false,
		},
	},
})

function createMockRouter() {
	const rootRoute = createRootRoute()
	const indexRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: '/',
	})
	const routeTree = rootRoute.addChildren([indexRoute])
	return createRouter({ routeTree })
}

function MockRouter({
	children,
	router = createMockRouter(),
}: {
	children: React.ReactNode
	router?: AnyRouter
}) {
	return (
		<QueryClientProvider client={testQueryClient}>
			<RouterContextProvider router={router}>{children}</RouterContextProvider>
		</QueryClientProvider>
	)
}

afterEach(() => {
	testQueryClient.clear()
})

async function renderSearchBar(
	props: React.ComponentProps<typeof SearchBar>,
): Promise<HTMLDivElement> {
	await resizeScreenshotViewport(
		server.config.browser.viewport.width,
		server.config.browser.viewport.height,
	)
	document.body.replaceChildren()
	const container = document.body.appendChild(document.createElement('div'))
	container.style.width = '100vw'
	container.style.minHeight = '100vh'
	const root = document.createElement('div')
	root.className = 'mx-auto w-full max-w-xl p-4'
	container.appendChild(root)
	await render(<SearchBar {...props} />, {
		container: root,
		wrapper: MockRouter,
	})
	return container
}

const originalWidth = window.innerWidth
const originalHeight = window.innerHeight

afterEach(async () => {
	await resizeScreenshotViewport(originalWidth, originalHeight)
})

async function focusSearch() {
	await userEvent.click(page.getByRole('combobox'))
}

describe('searchbar screenshots', () => {
	test.skipIf(server.config.name === 'mobile')(
		'typed query shows results',
		async () => {
			const container = await renderSearchBar({})
			await userEvent.fill(page.getByRole('combobox'), 'avatar')
			await expect
				.element(page.getByText(/Avatar: The Last Airbender/).first())
				.toBeVisible()
			await expectElementScreenshot(container, 'search-bar-typed-results')
		},
	)

	test.skipIf(server.config.name === 'mobile')(
		'typed query caps the dropdown at five suggestions',
		async ({ worker }) => {
			worker.use(
				http.get('/api/suggestions', () => {
					return HttpResponse.json(shows)
				}),
			)
			const container = await renderSearchBar({})
			await userEvent.fill(page.getByRole('combobox'), 'a')
			await expect
				.element(page.getByText(shows[0]!.title).first())
				.toBeVisible()
			await expect.poll(() => page.getByRole('option').all().length).toBe(6)
			await expectElementScreenshot(container, 'search-bar-capped-results')
		},
	)

	test.skipIf(server.config.name === 'mobile')(
		'typed query without matches shows the empty state',
		async ({ worker }) => {
			worker.use(http.get('/api/suggestions', () => HttpResponse.json([])))
			const container = await renderSearchBar({})
			await userEvent.fill(page.getByRole('combobox'), 'blahblah')
			await expect.element(page.getByText(/No TV Shows Found/)).toBeVisible()
			await expectElementScreenshot(container, 'search-bar-typed-no-results')
		},
	)

	test.skipIf(server.config.name === 'mobile')(
		'keyboard navigation highlights a suggestion',
		async () => {
			const container = await renderSearchBar({})
			await userEvent.fill(page.getByRole('combobox'), 'avatar')
			await expect
				.element(page.getByText(/Avatar: The Last Airbender/).first())
				.toBeVisible()
			await userEvent.keyboard('{ArrowDown}')
			await expect
				.element(page.getByRole('option').nth(1))
				.toHaveAttribute('aria-selected', 'true')
			await expectElementScreenshot(container, 'search-bar-keyboard-selection')
		},
	)

	test.skipIf(server.config.name === 'mobile')(
		'fetch error shows the retry row',
		async ({ worker }) => {
			worker.use(http.get('/api/suggestions', () => HttpResponse.error()))
			const container = await renderSearchBar({})
			await userEvent.fill(page.getByRole('combobox'), 'avatar')
			await expect
				.element(page.getByText(/Couldn’t load suggestions/))
				.toBeVisible()
			await expectElementScreenshot(container, 'search-bar-error-retry')
		},
	)

	test.skipIf(server.config.name !== 'mobile')(
		'mobile overlay with an empty query',
		async () => {
			await resizeScreenshotViewport(375, 812)
			const container = await renderSearchBar({ variant: 'standalone' })
			await focusSearch()
			await expectElementScreenshot(container, 'search-bar-overlay-empty')
		},
	)

	test.skipIf(server.config.name !== 'mobile')(
		'mobile overlay with a typed query',
		async () => {
			await resizeScreenshotViewport(375, 812)
			const container = await renderSearchBar({ variant: 'standalone' })
			await focusSearch()
			await userEvent.fill(page.getByRole('combobox'), 'avatar')
			await expect
				.element(page.getByText(/Avatar: The Last Airbender/).first())
				.toBeVisible()
			await expectElementScreenshot(container, 'search-bar-overlay-typed')
		},
	)
})
