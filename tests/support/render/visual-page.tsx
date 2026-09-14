import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
	RouterContextProvider,
	createRootRoute,
	createRoute,
	createRouter,
} from '@tanstack/react-router'
import { createElement } from 'react'
import type { ComponentType, ReactNode } from 'react'
import { expect } from 'vite-plus/test'
import { page, server } from 'vite-plus/test/browser'
import type { Locator } from 'vite-plus/test/browser'
import { render } from 'vitest-browser-react'
import type { RenderResult } from 'vitest-browser-react'

declare module 'vitest/browser' {
	interface BrowserCommands {
		resizeBrowserViewport: (width: number, height: number) => Promise<void>
	}
}

interface VisualPageOptions {
	component: ComponentType
	path: string
	waitFor: (screen: RenderResult) => Locator
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

function createWrapper(path: string, component: ComponentType) {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
		},
	})

	return function MockRouter({ children }: { children: ReactNode }) {
		return (
			<QueryClientProvider client={queryClient}>
				<RouterContextProvider router={createMockRouter(path, component)}>
					<div className="bg-background text-foreground min-h-screen w-screen antialiased">
						{children}
					</div>
				</RouterContextProvider>
			</QueryClientProvider>
		)
	}
}

// Vitest scales its iframe to fit the browser window. Resize both so tall
// page captures remain at one CSS pixel per image pixel.
export async function resizeScreenshotViewport(width: number, height: number) {
	await server.commands.resizeBrowserViewport(width, height)
	await page.viewport(width, height)
}

async function waitForPageIdle() {
	await document.fonts.ready
	await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
	await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
}

export async function expectElementScreenshot(
	target: Locator | HTMLElement,
	name: string,
) {
	await waitForPageIdle()
	await expect
		.element(target)
		.toMatchScreenshot(
			`${name}${server.config.name?.endsWith('-mobile') ? '-mobile' : ''}.png`,
			{
				screenshotOptions: {
					animations: 'disabled',
					caret: 'hide',
					scale: 'css',
				},
			},
		)
}

export async function renderVisualPage({
	component,
	path,
	waitFor,
}: VisualPageOptions) {
	const viewport = server.config.browser.viewport
	localStorage.clear()
	document.documentElement.classList.remove('dark')
	document.body.replaceChildren()
	await resizeScreenshotViewport(viewport.width, viewport.height)

	const container = document.body.appendChild(document.createElement('div'))
	container.style.width = '100vw'
	container.style.minHeight = '100vh'

	const screen = await render(createElement(component), {
		container,
		wrapper: createWrapper(path, component),
	})

	await expect.element(waitFor(screen)).toBeVisible()
	await waitForPageIdle()

	return {
		screen,
		expectScreenshot: async (name: string) => {
			try {
				await resizeScreenshotViewport(
					viewport.width,
					Math.max(viewport.height, Math.ceil(container.scrollHeight)),
				)
				await waitForPageIdle()
				// Viewport-relative charts can grow after the first resize.
				await resizeScreenshotViewport(
					viewport.width,
					Math.max(viewport.height, Math.ceil(container.scrollHeight)),
				)
				await waitForPageIdle()
				await expect
					.poll(() =>
						Array.from(container.querySelectorAll('img')).every(
							(image) => image.complete,
						),
					)
					.toBe(true)
				await expectElementScreenshot(screen.locator, name)
			} finally {
				await resizeScreenshotViewport(viewport.width, viewport.height)
			}
		},
	}
}
