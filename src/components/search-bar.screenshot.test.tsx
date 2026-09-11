import { test, expect, describe, afterEach } from '@config/test/browser'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
	createRootRoute,
	createRoute,
	createRouter,
	RouterContextProvider,
	type AnyRouter,
} from '@tanstack/react-router'
import { http, HttpResponse } from 'msw'
import { page, userEvent } from 'vite-plus/test/browser'
import { vi } from 'vitest'
import { render } from 'vitest-browser-react'

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

vi.mock('@/lib/thumbnail/client', async (importOriginal) => {
	const { queryOptions } = await import('@tanstack/react-query')
	return {
		...(await importOriginal<typeof import('@/lib/thumbnail/client')>()),
		showImageQuery: (imdbId: string) =>
			queryOptions({
				queryKey: ['show-image', imdbId],
				queryFn: () => null,
			}),
	}
})

async function renderSearchBar(
	props: React.ComponentProps<typeof SearchBar>,
): Promise<HTMLDivElement> {
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

async function waitForPageIdle() {
	await document.fonts.ready
	await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
	await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
}

async function expectSearchBarScreenshot(container: HTMLElement, name: string) {
	await waitForPageIdle()
	await expect.element(container).toMatchScreenshot(`${name}.png`, {
		screenshotOptions: {
			animations: 'disabled',
			caret: 'hide',
			scale: 'css',
		},
	})
}

const originalWidth = window.innerWidth
const originalHeight = window.innerHeight

afterEach(async () => {
	await page.viewport(originalWidth, originalHeight)
})

async function focusSearch() {
	await userEvent.click(page.getByRole('combobox'))
}

describe('searchbar screenshots', () => {
	test('typed query shows results', async () => {
		await page.viewport(1280, 720)
		const container = await renderSearchBar({})
		await userEvent.fill(page.getByRole('combobox'), 'avatar')
		await expect
			.element(page.getByText(/Avatar: The Last Airbender/).first())
			.toBeVisible()
		await expectSearchBarScreenshot(container, 'search-bar-typed-results')
	})

	test('typed query without matches shows the empty state', async ({
		worker,
	}) => {
		worker.use(http.get('/api/suggestions', () => HttpResponse.json([])))
		await page.viewport(1280, 720)
		const container = await renderSearchBar({})
		await userEvent.fill(page.getByRole('combobox'), 'blahblah')
		await expect.element(page.getByText(/No TV Shows Found/)).toBeVisible()
		await expectSearchBarScreenshot(container, 'search-bar-typed-no-results')
	})

	test('keyboard navigation highlights a suggestion', async () => {
		await page.viewport(1280, 720)
		const container = await renderSearchBar({})
		await userEvent.fill(page.getByRole('combobox'), 'avatar')
		await expect
			.element(page.getByText(/Avatar: The Last Airbender/).first())
			.toBeVisible()
		await userEvent.keyboard('{ArrowDown}')
		await expectSearchBarScreenshot(container, 'search-bar-keyboard-selection')
	})

	test('fetch error shows the retry row', async ({ worker }) => {
		worker.use(http.get('/api/suggestions', () => HttpResponse.error()))
		await page.viewport(1280, 720)
		const container = await renderSearchBar({})
		await userEvent.fill(page.getByRole('combobox'), 'avatar')
		await expect
			.element(page.getByText(/Couldn’t load suggestions/))
			.toBeVisible()
		await expectSearchBarScreenshot(container, 'search-bar-error-retry')
	})

	test('mobile overlay with an empty query', async () => {
		await page.viewport(375, 812)
		const container = await renderSearchBar({ mobileSearchOverlay: true })
		await focusSearch()
		await expectSearchBarScreenshot(
			container,
			'search-bar-mobile-overlay-empty',
		)
	})

	test('mobile overlay with a typed query', async () => {
		await page.viewport(375, 812)
		const container = await renderSearchBar({ mobileSearchOverlay: true })
		await focusSearch()
		await userEvent.fill(page.getByRole('combobox'), 'avatar')
		await expect
			.element(page.getByText(/Avatar: The Last Airbender/).first())
			.toBeVisible()
		await expectSearchBarScreenshot(
			container,
			'search-bar-mobile-overlay-typed',
		)
	})

	test('full-width dropdown matches the searchbar column', async () => {
		await page.viewport(1280, 720)
		const container = await renderSearchBar({ fullWidthDropdown: true })
		await userEvent.fill(page.getByRole('combobox'), 'avatar')
		await expect
			.element(page.getByText(/Avatar: The Last Airbender/).first())
			.toBeVisible()
		await expectSearchBarScreenshot(container, 'search-bar-full-width-open')
	})

	test('full-width dropdown on mobile', async () => {
		await page.viewport(375, 812)
		const container = await renderSearchBar({ fullWidthDropdown: true })
		await userEvent.fill(page.getByRole('combobox'), 'avatar')
		await expect
			.element(page.getByText(/Avatar: The Last Airbender/).first())
			.toBeVisible()
		await expectSearchBarScreenshot(
			container,
			'search-bar-full-width-open-mobile',
		)
	})
})
