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

import { shows } from '@/lib/imdb/__fixtures__/shows'
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

	test('opens a keyboard-docked mobile search overlay with popover styling', async () => {
		const originalWidth = window.innerWidth
		const originalHeight = window.innerHeight
		try {
			await page.viewport(375, 667)
			const screen = await render(<SearchBar mobileSearchOverlay />, {
				wrapper: MockRouter,
			})

			await userEvent.click(screen.getByRole('combobox'))
			await expect
				.element(page.getByRole('button', { name: 'Close search' }))
				.toBeVisible()
			await userEvent.fill(screen.getByRole('combobox'), 'avatar')
			await expect
				.element(screen.getByText(/Avatar: The Last Airbender/).first())
				.toBeVisible()
			expect(
				page.getByRole('button', { name: 'Close search' }),
			).not.toBeInTheDocument()
			expect(
				page.getByRole('button', { name: 'Clear search' }),
			).toBeInTheDocument()
			expect(document.querySelector('[cmdk-root]')?.className).toContain(
				'max-md:fixed',
			)
			expect(document.querySelector('[cmdk-root]')?.className).toContain(
				'max-md:animate-in',
			)
			const list = document.querySelector('[cmdk-list]')
			expect(list?.className).toContain('max-md:static')
			expect(list?.className).toContain('bg-popover')
			expect(list?.className).toContain('border')
			expect(list?.className).toContain('p-2')
		} finally {
			await page.viewport(originalWidth, originalHeight)
		}
	})

	test('close button dismisses the mobile search overlay', async () => {
		const originalWidth = window.innerWidth
		const originalHeight = window.innerHeight
		try {
			await page.viewport(375, 667)
			const screen = await render(<SearchBar mobileSearchOverlay />, {
				wrapper: MockRouter,
			})

			const searchBar = screen.getByRole('combobox')
			await userEvent.click(searchBar)
			await expect.element(page.getByText('Breaking Bad')).toBeVisible()

			await userEvent.click(page.getByRole('button', { name: 'Close search' }))

			await expect
				.element(page.getByText('Breaking Bad'))
				.not.toBeInTheDocument()
			expect(
				page.getByRole('button', { name: 'Close search' }),
			).not.toBeInTheDocument()
			expect(searchBar).toHaveValue('')
		} finally {
			await page.viewport(originalWidth, originalHeight)
		}
	})

	test('tapping the empty area below the results dismisses the mobile overlay', async () => {
		const originalWidth = window.innerWidth
		const originalHeight = window.innerHeight
		try {
			await page.viewport(375, 667)
			const screen = await render(<SearchBar mobileSearchOverlay />, {
				wrapper: MockRouter,
			})

			const searchBar = screen.getByRole('combobox')
			await userEvent.click(searchBar)
			await userEvent.fill(searchBar, 'avatar')
			await expect
				.element(screen.getByText(/Avatar: The Last Airbender/).first())
				.toBeVisible()

			const commandRoot = document.querySelector('[cmdk-root]')
			if (!commandRoot) throw new Error('cmdk root not found')
			commandRoot.dispatchEvent(
				new PointerEvent('pointerdown', { bubbles: true }),
			)

			await expect
				.element(page.getByText(/Avatar: The Last Airbender/).first())
				.not.toBeInTheDocument()
			expect(searchBar).toHaveValue('')
		} finally {
			await page.viewport(originalWidth, originalHeight)
		}
	})

	test('basic search', async () => {
		const screen = await render(<SearchBar fullWidthDropdown />, {
			wrapper: MockRouter,
		})

		const searchBar = screen.getByRole('combobox')
		await userEvent.fill(searchBar, 'avatar')
		await expect
			.element(page.getByText(/Avatar: The Last Airbender/).first())
			.toBeVisible()
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
			params: { id: 'tt0417299' },
			to: '/ratings/$id',
		})
		expect(searchBar).toHaveValue('')
		expect(document.body.textContent).not.toContain(
			'Avatar: The Last Airbender',
		)
	})

	test('Enter opens full search results without selecting a suggestion', async () => {
		const router = createMockRouter()
		const navigateSpy = vi.spyOn(router, 'navigate')
		const screen = await render(<SearchBar />, {
			wrapper: (props) => <MockRouter router={router} {...props} />,
		})

		const searchBar = screen.getByRole('combobox')
		await userEvent.fill(searchBar, 'sopranos')
		await expect
			.element(screen.getByText(/Search all results for “sopranos”/i))
			.toBeVisible()
		await userEvent.keyboard('{Enter}')

		expect(navigateSpy).toHaveBeenCalledWith({
			params: { query: 'sopranos' },
			to: '/search/$query',
		})
	})

	test('ArrowDown past the last result reaches the search-all entry', async () => {
		const router = createMockRouter()
		const navigateSpy = vi.spyOn(router, 'navigate')
		const screen = await render(<SearchBar />, {
			wrapper: (props) => <MockRouter router={router} {...props} />,
		})

		const searchBar = screen.getByRole('combobox')
		await userEvent.fill(searchBar, 'avatar')
		await expect
			.element(screen.getByText(/Search all results for “avatar”/i))
			.toBeVisible()

		await userEvent.keyboard('{ArrowUp}')
		await expect
			.element(screen.getByRole('option', { name: /Search all results for/i }))
			.toHaveAttribute('aria-selected', 'true')

		await userEvent.keyboard('{Enter}')
		expect(navigateSpy).toHaveBeenCalledWith({
			params: { query: 'avatar' },
			to: '/search/$query',
		})
	})

	test('does not highlight a suggestion until keyboard navigation starts', async () => {
		const screen = await render(<SearchBar />, {
			wrapper: MockRouter,
		})

		const searchBar = screen.getByRole('combobox')
		await userEvent.fill(searchBar, 'avatar')
		await expect
			.element(screen.getByText(/Avatar: The Last Airbender/).first())
			.toBeVisible()
		expect(document.querySelector('[aria-selected="true"]')).toBeNull()

		await userEvent.keyboard('{ArrowDown}')
		expect(document.querySelector('[aria-selected="true"]')).not.toBeNull()
	})

	test('search menu matches the searchbar column on desktop', async () => {
		const screen = await render(<SearchBar fullWidthDropdown />, {
			wrapper: MockRouter,
		})

		const searchBar = screen.getByRole('combobox')
		await userEvent.fill(searchBar, 'avatar')
		await expect
			.element(screen.getByText(/Avatar: The Last Airbender/).first())
			.toBeVisible()
		const list = document.querySelector('[cmdk-list]')
		expect(list?.className).toContain('fixed')
		expect(list?.className).toContain('md:inset-x-0')
		expect(list?.className).toContain('md:mx-auto')
		expect(list?.className).toContain('md:max-w-md')
	})

	test('search menu is fixed full width on mobile with fullWidthDropdown', async () => {
		const originalWidth = window.innerWidth
		const originalHeight = window.innerHeight
		try {
			await page.viewport(375, 667)
			const screen = await render(<SearchBar fullWidthDropdown />, {
				wrapper: MockRouter,
			})

			const searchBar = screen.getByRole('combobox')
			await userEvent.fill(searchBar, 'avatar')
			await expect
				.element(screen.getByText(/Avatar: The Last Airbender/).first())
				.toBeVisible()
			const list = document.querySelector('[cmdk-list]')
			expect(list?.className).toContain('fixed')
			expect(list?.className).toContain('inset-x-4')
			expect(list?.className).toContain('md:inset-x-0')
			expect(list?.className).not.toContain('max-md:absolute')
		} finally {
			await page.viewport(originalWidth, originalHeight)
		}
	})

	test('renders a blurred backdrop behind the open search with fullWidthDropdown', async () => {
		const screen = await render(<SearchBar fullWidthDropdown />, {
			wrapper: MockRouter,
		})

		expect(document.querySelector('[data-slot="search-backdrop"]')).toBeNull()

		await userEvent.click(screen.getByRole('combobox'))
		await expect.element(screen.getByText(/Breaking Bad/)).toBeVisible()
		const backdrop = document.querySelector('[data-slot="search-backdrop"]')
		expect(backdrop?.className).toContain('fixed')
		expect(backdrop?.className).toContain('backdrop-blur-sm')
		expect(backdrop?.className).toContain('bg-background/60')
	})

	test('no backdrop behind the home page search', async () => {
		const screen = await render(<SearchBar />, {
			wrapper: MockRouter,
		})

		await userEvent.click(screen.getByRole('combobox'))
		await expect.element(screen.getByText(/Breaking Bad/)).toBeVisible()
		expect(document.querySelector('[data-slot="search-backdrop"]')).toBeNull()
	})

	test('clear button empties the query and hides the results', async () => {
		const screen = await render(<SearchBar />, {
			wrapper: MockRouter,
		})

		const searchBar = screen.getByRole('combobox')
		await userEvent.fill(searchBar, 'avatar')
		await expect
			.element(screen.getByText(/Avatar: The Last Airbender/).first())
			.toBeVisible()

		await userEvent.click(page.getByRole('button', { name: 'Clear search' }))

		expect(searchBar).toHaveValue('')
		expect(document.body.textContent).not.toContain(
			'Avatar: The Last Airbender',
		)
		expect(
			page.getByRole('button', { name: 'Clear search' }),
		).not.toBeInTheDocument()
	})

	test('shows default top shows when focused with an empty query', async () => {
		const screen = await render(<SearchBar />, {
			wrapper: MockRouter,
		})

		await userEvent.click(screen.getByRole('combobox'))

		await expect.element(screen.getByText('Breaking Bad')).toBeVisible()
		await expect.element(screen.getByText('The Sopranos')).toBeVisible()
		expect(screen.container.querySelectorAll('[cmdk-item]').length).toBe(5)
	})

	test('clicking outside closes the dropdown and keeps the query', async () => {
		const screen = await render(<SearchBar />, {
			wrapper: MockRouter,
		})

		const searchBar = screen.getByRole('combobox')
		await userEvent.fill(searchBar, 'avatar')
		await expect
			.element(screen.getByText(/Avatar: The Last Airbender/).first())
			.toBeVisible()

		document.body.dispatchEvent(
			new PointerEvent('pointerdown', { bubbles: true }),
		)

		await expect
			.element(page.getByText(/Avatar: The Last Airbender/).first())
			.not.toBeInTheDocument()
		expect(searchBar).toHaveValue('avatar')
	})

	test('clicking outside the mobile dialog dismisses it and clears the query', async () => {
		const originalWidth = window.innerWidth
		const originalHeight = window.innerHeight
		try {
			await page.viewport(375, 667)
			const screen = await render(<SearchBar mobileSearchOverlay />, {
				wrapper: MockRouter,
			})

			const searchBar = screen.getByRole('combobox')
			await userEvent.click(searchBar)
			await userEvent.fill(searchBar, 'avatar')
			await expect
				.element(screen.getByText(/Avatar: The Last Airbender/).first())
				.toBeVisible()

			document.body.dispatchEvent(
				new PointerEvent('pointerdown', { bubbles: true }),
			)

			await expect
				.element(page.getByText(/Avatar: The Last Airbender/).first())
				.not.toBeInTheDocument()
			expect(
				page.getByRole('button', { name: 'Close search' }),
			).not.toBeInTheDocument()
			expect(searchBar).toHaveValue('')
		} finally {
			await page.viewport(originalWidth, originalHeight)
		}
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

	test('error message offers a retry that recovers', async ({ worker }) => {
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
		const message = screen.getByText(/Couldn’t load suggestions/i)
		await expect.element(message).toBeVisible()

		worker.use(
			http.get('/api/suggestions', () => {
				return HttpResponse.json([
					shows.find((show) => show.imdbId === 'tt0417299'),
				])
			}),
		)
		await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
		await expect
			.element(screen.getByText(/Avatar: The Last Airbender/).first())
			.toBeVisible()
		expect(message.query()).not.toBeInTheDocument()
	})

	test('skips the spinner when suggestions resolve quickly', async () => {
		const screen = await render(<SearchBar />, {
			wrapper: MockRouter,
		})
		const searchBar = screen.getByRole('combobox')
		await userEvent.fill(searchBar, 'avatar')
		await expect
			.element(page.getByText(/Avatar: The Last Airbender/).first())
			.toBeVisible()

		expect(document.querySelector('[data-testid="loading-spinner"]')).toBeNull()
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
