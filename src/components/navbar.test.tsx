import { test, expect } from '@config/test/browser'
import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	RouterContextProvider,
	type AnyRouter,
} from '@tanstack/react-router'
import { userEvent } from 'vite-plus/test/browser'
import { render } from 'vitest-browser-react'

import { Navbar } from './navbar'

function createTestRouter(initialPath: string) {
	const rootRoute = createRootRoute()
	const indexRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: '/',
		component: () => <div>Home page</div>,
	})
	const ratingsRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: '/ratings/$id',
		component: () => <div>Ratings page</div>,
	})
	const routeTree = rootRoute.addChildren([indexRoute, ratingsRoute])
	return createRouter({
		routeTree,
		history: createMemoryHistory({ initialEntries: [initialPath] }),
	})
}

function MockRouter({
	children,
	router,
}: {
	children: React.ReactNode
	router: AnyRouter
}) {
	return (
		<RouterContextProvider router={router}>{children}</RouterContextProvider>
	)
}

test('home button navigates to the index route from a show page', async () => {
	const router = createTestRouter('/ratings/tt0417299')
	const screen = await render(<Navbar />, {
		wrapper: (props) => <MockRouter router={router} {...props} />,
	})

	await userEvent.click(screen.getByRole('link', { name: 'Home' }))

	await expect.poll(() => router.state.location.pathname).toBe('/')
})
