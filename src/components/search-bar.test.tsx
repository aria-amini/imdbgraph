import { test } from '@config/test/browser'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
	createRootRoute,
	createRoute,
	createRouter,
	RouterContextProvider,
	type AnyRouter,
} from '@tanstack/react-router'
import { http, HttpResponse, delay } from 'msw'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { beforeEach, describe, expect, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { page, userEvent } from 'vitest/browser'

import suggestions from '@/mocks/data/suggestions.json' with { type: 'json' }

import { SearchBar } from './search-bar'

const testQueryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: false,
		},
	},
})

beforeEach(() => {
	testQueryClient.clear()
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

describe('searchbar tests', () => {
	test('keeps a 16px mobile input size to prevent Safari focus zoom', async () => {
		await render(
			<div className="mx-auto max-w-md px-4 py-3">
				<SearchBar />
			</div>,
			{
				wrapper: MockRouter,
			},
		)

		const input = document.querySelector('input[role="combobox"]')
		if (!(input instanceof HTMLInputElement)) {
			throw new Error('Search input not found')
		}

		const expectFontSizeAt = async (
			width: number,
			height: number,
			expectedSize: string,
		) => {
			await page.viewport(width, height)
			await expect
				.poll(() => getComputedStyle(input).fontSize, { timeout: 5_000 })
				.toBe(expectedSize)
		}

		const originalWidth = window.innerWidth
		const originalHeight = window.innerHeight
		try {
			await expectFontSizeAt(375, 667, '16px')
			await expectFontSizeAt(768, 1024, '14px')
			await expectFontSizeAt(1280, 720, '14px')
		} finally {
			await page.viewport(originalWidth, originalHeight)
		}
	})

	test('basic search', async () => {
		const screen = await render(<SearchBar />, {
			wrapper: MockRouter,
		})

		const searchBar = screen.getByRole('combobox')
		await userEvent.fill(searchBar, 'avatar')
		await expect
			.element(page.getByText(/Avatar: The Last Airbender/).first())
			.toBeVisible()
	})

	test('debounces suggestion requests while typing', async ({ worker }) => {
		const requestedQueries: string[] = []
		worker.use(
			http.get('/api/suggestions', ({ request }) => {
				requestedQueries.push(new URL(request.url).searchParams.get('q') ?? '')
				return HttpResponse.json(suggestions)
			}),
		)

		const screen = await render(<SearchBar />, {
			wrapper: MockRouter,
		})
		const searchBar = screen.getByRole('combobox')
		await userEvent.fill(searchBar, 'ava')
		await userEvent.fill(searchBar, 'avatar')

		await expect
			.element(page.getByText(/Avatar: The Last Airbender/).first())
			.toBeVisible()
		expect(requestedQueries).toEqual(['avatar'])
	})

	test('is disabled until hydration completes', async () => {
		const rootElement = document.createElement('div')
		document.body.append(rootElement)

		const router = createMockRouter()
		rootElement.innerHTML = renderToString(
			<MockRouter router={router}>
				<SearchBar />
			</MockRouter>,
		)

		const input = rootElement.querySelector('input')
		if (!(input instanceof HTMLInputElement)) {
			throw new Error('Search input not found')
		}

		expect(input.disabled).toBe(true)

		const root = hydrateRoot(
			rootElement,
			<MockRouter router={router}>
				<SearchBar />
			</MockRouter>,
		)

		await expect.element(page.getByRole('combobox')).not.toBeDisabled()

		root.unmount()
		rootElement.remove()
	})

	test('ArrowDown moves to next result on Enter', async () => {
		const router = createMockRouter()
		const navigateSpy = vi.spyOn(router, 'navigate')
		const screen = await render(<SearchBar />, {
			wrapper: (props) => <MockRouter router={router} {...props} />,
		})

		const searchBar = screen.getByRole('combobox')
		await userEvent.fill(searchBar, 'avatar')
		await expect
			.element(page.getByText(/Avatar: The Last Airbender/).first())
			.toBeVisible()
		await userEvent.keyboard('{ArrowDown}{Enter}')

		expect(navigateSpy).toHaveBeenCalledWith({
			params: { id: 'tt9018736' },
			to: '/ratings/$id',
		})
		expect(searchBar).toHaveValue('')
		expect(document.body.textContent).not.toContain(
			'Avatar: The Last Airbender',
		)
	})

	test('reserves Enter for search until the user navigates the list', async () => {
		const router = createMockRouter()
		const navigateSpy = vi.spyOn(router, 'navigate')
		const screen = await render(<SearchBar />, {
			wrapper: (props) => <MockRouter router={router} {...props} />,
		})

		const searchBar = screen.getByRole('combobox')
		await userEvent.fill(searchBar, 'avatar')
		await expect
			.element(page.getByText(/Avatar: The Last Airbender/).first())
			.toBeVisible()

		await userEvent.keyboard('{Enter}')
		expect(navigateSpy).not.toHaveBeenCalled()
		expect(searchBar).toHaveValue('avatar')

		// Navigating the list makes Enter activate the highlighted row.
		await userEvent.keyboard('{ArrowUp}{Enter}')
		expect(navigateSpy).toHaveBeenCalledWith({
			params: { id: 'tt0417299' },
			to: '/ratings/$id',
		})
	})

	test('click navigates once and closes the results', async () => {
		const router = createMockRouter()
		const navigateSpy = vi.spyOn(router, 'navigate')
		const screen = await render(<SearchBar />, {
			wrapper: (props) => <MockRouter router={router} {...props} />,
		})

		const searchBar = screen.getByRole('combobox')
		await userEvent.fill(searchBar, 'avatar')
		const result = screen
			.getByRole('option', {
				name: /Avatar: The Last Airbender/,
			})
			.first()
		await expect.element(result).toBeVisible()
		await userEvent.click(result)

		expect(navigateSpy).toHaveBeenCalledOnce()
		expect(searchBar).toHaveValue('')
		expect(document.body.textContent).not.toContain(
			'Avatar: The Last Airbender',
		)
	})

	test('modified click opens in a new tab and keeps the results open', async () => {
		const router = createMockRouter()
		const navigateSpy = vi.spyOn(router, 'navigate')
		const screen = await render(<SearchBar />, {
			wrapper: (props) => <MockRouter router={router} {...props} />,
		})

		const searchBar = screen.getByRole('combobox')
		await userEvent.fill(searchBar, 'avatar')
		const result = screen
			.getByRole('option', {
				name: /Avatar: The Last Airbender/,
			})
			.first()
		await expect.element(result).toBeVisible()
		await userEvent.click(result, { modifiers: ['Control'] })

		expect(navigateSpy).not.toHaveBeenCalled()
		expect(searchBar).toHaveValue('avatar')
		await expect.element(result).toBeVisible()
	})

	test('no results', async ({ worker }) => {
		worker.use(
			http.get('/api/suggestions', () => {
				return HttpResponse.json([])
			}),
		)

		const screen = await render(<SearchBar />, {
			wrapper: MockRouter,
		})
		const searchBar = screen.getByRole('combobox')
		await userEvent.fill(searchBar, 'blah')
		await expect.element(screen.getByText(/No TV Shows Found./i)).toBeVisible()
	})

	test('shows a loading state while refreshing empty suggestions', async ({
		worker,
	}) => {
		worker.use(
			http.get('/api/suggestions', async ({ request }) => {
				if (new URL(request.url).searchParams.get('q') === 'blahx') {
					await delay(600)
				}
				return HttpResponse.json([])
			}),
		)

		const screen = await render(<SearchBar />, {
			wrapper: MockRouter,
		})
		const searchBar = screen.getByRole('combobox')
		const emptyState = screen.getByText(/No TV Shows Found./i)
		await userEvent.fill(searchBar, 'blah')
		await expect.element(emptyState).toBeVisible()

		await userEvent.fill(searchBar, 'blahx')
		await expect.element(screen.getByText('Searching...')).toBeVisible()
		await expect.element(searchBar).toHaveAttribute('aria-busy', 'true')
		await expect.element(screen.getByText('Searching...')).toBeVisible()
		await expect.element(emptyState).toBeVisible()
	})

	test('keeps previous suggestions visible without a searching state', async ({
		worker,
	}) => {
		worker.use(
			http.get('/api/suggestions', async ({ request }) => {
				if (new URL(request.url).searchParams.get('q') === 'avatarx') {
					await delay(800)
					return HttpResponse.json([])
				}
				return HttpResponse.json(suggestions)
			}),
		)

		const screen = await render(<SearchBar />, {
			wrapper: MockRouter,
		})
		const searchBar = screen.getByRole('combobox')
		await userEvent.fill(searchBar, 'avatar')
		const suggestion = page
			.getByRole('option', { name: /Avatar: The Last Airbender/ })
			.first()
		await expect.element(suggestion).toBeVisible()

		await userEvent.fill(searchBar, 'avatarx')
		await expect.element(searchBar).toHaveAttribute('aria-busy', 'true')
		expect(document.body.textContent).not.toContain('Searching...')
		await expect.element(suggestion).toBeVisible()

		await expect.element(screen.getByText(/No TV Shows Found./i)).toBeVisible()
		expect(document.body.textContent).not.toContain(
			'Avatar: The Last Airbender',
		)
	})

	test('selects the first suggestion of every new result set', async ({
		worker,
	}) => {
		const overlappingResults = [
			{
				imdbId: 'tt0417299',
				title: 'Avatar: The Last Airbender',
				startYear: '2005',
				endYear: '2008',
				rating: 9.3,
				numVotes: 410746,
			},
		]
		worker.use(
			http.get('/api/suggestions', async ({ request }) => {
				const query = new URL(request.url).searchParams.get('q')
				await delay(query === 'avatar' ? 400 : 0)
				if (query === 'avatar') {
					// The 2005 show survives into the refined set at index 1, which
					// tempts cmdk into keeping it highlighted instead of row one.
					return HttpResponse.json([
						{
							imdbId: 'tt0000001',
							title: 'Avatar Studios Documentary',
							startYear: '2026',
							endYear: null,
							rating: 8.0,
							numVotes: 100,
						},
						...overlappingResults,
					])
				}
				return HttpResponse.json([
					{
						imdbId: 'tt9018736',
						title: 'Avatar: The Last Airbender (2024)',
						startYear: '2024',
						endYear: null,
						rating: 7.2,
						numVotes: 80299,
					},
					...overlappingResults,
				])
			}),
		)

		const screen = await render(<SearchBar />, {
			wrapper: MockRouter,
		})
		const searchBar = screen.getByRole('combobox')
		await userEvent.fill(searchBar, 'avat')
		const initialFirst = page
			.getByRole('option', { name: /Avatar: The Last Airbender \(2024\)/ })
			.first()
		await expect.element(initialFirst).toBeVisible()
		await expect.element(initialFirst).toHaveAttribute('aria-selected', 'true')

		// Highlight the overlapping result before refining the query.
		await userEvent.keyboard('{ArrowDown}')
		const overlapping = page.getByRole('option', { name: /2005/ })
		await expect.element(overlapping).toHaveAttribute('aria-selected', 'true')

		await userEvent.fill(searchBar, 'avatar')
		const refinedFirst = page.getByRole('option', { name: /Studios/ })
		await expect.element(refinedFirst).toBeVisible()
		await expect.element(refinedFirst).toHaveAttribute('aria-selected', 'true')
		await expect.element(overlapping).toHaveAttribute('aria-selected', 'false')
	})

	test('error message', async ({ worker }) => {
		worker.use(
			http.get('/api/suggestions', () => {
				return HttpResponse.error()
			}),
		)

		const screen = await render(<SearchBar />, {
			wrapper: MockRouter,
		})
		const searchBar = screen.getByRole('combobox')
		await userEvent.fill(searchBar, 'error')
		await expect
			.element(screen.getByText(/Something went wrong. Please try again./i))
			.toBeVisible()
	})

	test('skips the spinner when suggestions resolve quickly', async ({
		worker,
	}) => {
		let requestStarted = false
		worker.use(
			http.get('/api/suggestions', async () => {
				requestStarted = true
				await delay(250)
				return HttpResponse.json(suggestions)
			}),
		)

		const screen = await render(<SearchBar />, {
			wrapper: MockRouter,
		})
		const searchBar = screen.getByRole('combobox')
		await userEvent.fill(searchBar, 'avatar')
		await expect.poll(() => requestStarted).toBe(true)
		expect(document.querySelector('[data-testid="loading-spinner"]')).toBeNull()

		await expect
			.element(page.getByText(/Avatar: The Last Airbender/).first())
			.toBeVisible()
	})

	test('shows the spinner while a slow request is in flight', async ({
		worker,
	}) => {
		worker.use(
			http.get('/api/suggestions', async () => {
				await delay(600)
				return HttpResponse.json(suggestions)
			}),
		)

		const screen = await render(<SearchBar />, {
			wrapper: MockRouter,
		})
		const searchBar = screen.getByRole('combobox')
		await userEvent.fill(searchBar, 'avatar')

		await expect.element(page.getByTestId('loading-spinner')).toBeVisible()
		await expect
			.element(page.getByText(/Avatar: The Last Airbender/).first())
			.toBeVisible()
		expect(document.querySelector('[data-testid="loading-spinner"]')).toBeNull()
	})
})
