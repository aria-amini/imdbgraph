import {
	renderPage,
	type PageWrapperProps,
	type RenderPageOptions,
} from '@aamini/config/vitest/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
	RouterContextProvider,
	createRootRoute,
	createRoute,
	createRouter,
} from '@tanstack/react-router'
import { useState, type ComponentType } from 'react'

import type { Theme } from '@/lib/theme'
import { applyThemeToDocument } from '@/lib/theme'

interface VisualPageOptions {
	component: ComponentType
	path: string
	theme?: Theme
	waitFor: NonNullable<RenderPageOptions['waitFor']>
}

function createMockRouter(path: string, component: ComponentType) {
	const rootRoute = createRootRoute()

	const testRoute = createRoute({
		getParentRoute: () => rootRoute,
		path,
		component: () => {
			const Component = component

			return <Component />
		},
	})

	return createRouter({
		routeTree: rootRoute.addChildren([testRoute]),
	})
}

function AppWrapper({ children, path, component }: PageWrapperProps) {
	const [queryClient] = useState(
		() => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
	)

	const [router] = useState(() => createMockRouter(path, component))

	return (
		<QueryClientProvider client={queryClient}>
			<RouterContextProvider router={router}>
				<div className="bg-background text-foreground min-h-screen w-screen antialiased">
					{children}
				</div>
			</RouterContextProvider>
		</QueryClientProvider>
	)
}

/** Renders a route component inside the app providers at a theme. */
export function renderVisualPage({
	component,
	path,
	theme = 'light',
	waitFor,
}: VisualPageOptions) {
	return renderPage(component, {
		path,
		waitFor,
		wrapper: AppWrapper,
		setup: () => applyThemeToDocument(theme),
	})
}
