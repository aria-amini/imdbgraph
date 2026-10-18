import {
	expectScreenshot,
	waitForPageIdle,
	type ScreenshotOptions,
} from '@aamini/config/vitest/browser'
import { QueryClient, QueryClientProvider } from '@tanstack/solid-query'
import {
	RouterContextProvider,
	createRootRoute,
	createRoute,
	createRouter,
} from '@tanstack/solid-router'
import type { Component } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { expect } from 'vite-plus/test'
import { page, server, type Locator } from 'vite-plus/test/browser'
import { render, type RenderResult } from 'vitest-browser-solid'

import type { Theme } from '@/lib/theme'
import { applyThemeToDocument } from '@/lib/theme'

interface VisualPageOptions {
	component: Component
	path: string
	theme?: Theme
	waitFor: (screen: RenderResult) => Locator
}

function createMockRouter(path: string, component: Component) {
	const rootRoute = createRootRoute()

	const testRoute = createRoute({
		getParentRoute: () => rootRoute,
		path,
		component,
	})

	return createRouter({
		routeTree: rootRoute.addChildren([testRoute]),
	})
}

/**
 * Renders a route component full width in a clean document at the browser
 * instance viewport, inside the app providers at a theme.
 */
export async function renderVisualPage({
	component,
	path,
	theme = 'light',
	waitFor,
}: VisualPageOptions) {
	localStorage.clear()
	document.body.replaceChildren()
	applyThemeToDocument(theme)
	await server.commands.resizeBrowserViewport(
		window.innerWidth,
		window.innerHeight,
	)
	await page.viewport(window.innerWidth, window.innerHeight)

	const container = document.body.appendChild(document.createElement('div'))
	container.style.width = '100vw'
	container.style.minHeight = '100vh'

	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	})

	const router = createMockRouter(path, component)

	const screen = render(
		() => (
			<QueryClientProvider client={queryClient}>
				<RouterContextProvider router={router}>
					{() => (
						<div class="bg-background text-foreground min-h-screen w-screen antialiased">
							<Dynamic component={component} />
						</div>
					)}
				</RouterContextProvider>
			</QueryClientProvider>
		),
		{ container },
	)

	await expect.element(waitFor(screen), { timeout: 3_000 }).toBeVisible()
	await waitForPageIdle()

	return {
		screen,
		expectScreenshot: (name: string, screenshotOptions?: ScreenshotOptions) =>
			expectScreenshot(
				page.elementLocator(screen.baseElement),
				name,
				screenshotOptions,
			),
	}
}
