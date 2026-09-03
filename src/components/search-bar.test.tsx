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

vi.mock(import('@/lib/react-query'), () => ({
	queryClient: testQueryClient,
}))

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
	test('uses a 16px input size on small screens to prevent Safari focus zoom', async () => {
		const screen = await render(<SearchBar />, {
			wrapper: MockRouter,
		})

		const searchBar = screen.getByRole('combobox')
		expect(searchBar).toHaveClass('text-base', 'md:text-sm')
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
