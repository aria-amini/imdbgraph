import { test } from '@config/test/browser'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
	createRootRoute,
	createRoute,
	createRouter,
	RouterContextProvider,
	type AnyRouter,
} from '@tanstack/react-router'
import { http, HttpResponse } from 'msw'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { beforeEach, describe, expect, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { page, userEvent } from 'vitest/browser'

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

	test('opens a keyboard-docked mobile search overlay', async () => {
		const originalWidth = window.innerWidth
		const originalHeight = window.innerHeight
		try {
			await page.viewport(375, 667)
			const screen = await render(<SearchBar mobileSearchOverlay />, {
				wrapper: MockRouter,
			})

			await userEvent.click(screen.getByRole('combobox'))
			await userEvent.fill(screen.getByRole('combobox'), 'avatar')
			await expect
				.element(screen.getByText(/Avatar: The Last Airbender/).first())
				.toBeVisible()
			await expect
				.element(page.getByRole('button', { name: 'Close search' }))
				.toBeVisible()
			expect(document.querySelector('[cmdk-root]')?.className).toContain(
				'max-md:fixed',
			)
			expect(document.querySelector('[cmdk-root]')?.className).toContain(
				'max-md:inset-0',
			)
			expect(document.querySelector('[cmdk-list]')?.className).toContain(
				'max-md:static',
			)
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

	test('search menu is full width', async () => {
		const screen = await render(<SearchBar fullWidthDropdown />, {
			wrapper: MockRouter,
		})

		const searchBar = screen.getByRole('combobox')
		await userEvent.fill(searchBar, 'avatar')
		await expect
			.element(screen.getByText(/Avatar: The Last Airbender/).first())
			.toBeVisible()
		const command = document.querySelector('[cmdk-root]')
		const list = document.querySelector('[cmdk-list]')
		expect(command?.className).toContain('w-full')
		expect(list?.className).toContain('w-full')
		expect(list?.className).toContain('fixed')
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
})
