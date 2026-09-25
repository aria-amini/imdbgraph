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

import type { Theme } from '@/lib/theme'
import { applyThemeToDocument } from '@/lib/theme'

declare module 'vitest/browser' {
	interface BrowserCommands {
		resetScreenshotPointer: () => Promise<void>
		resizeBrowserViewport: (width: number, height: number) => Promise<void>
	}
}

// Each browser instance pins its own viewport, so the live window size is the
// capture size. Name suffixes distinguish baselines per instance.
function currentViewport() {
	const width = window.innerWidth
	const height = window.innerHeight

	return { width, height, suffix: width < 768 ? '-mobile' : '' }
}

interface VisualPageOptions {
	component: ComponentType
	path: string
	theme?: Theme
	fullHeight?: boolean
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
	const { suffix } = currentViewport()
	await server.commands.resetScreenshotPointer()
	await waitForPageIdle()
	await expect.element(target).toMatchScreenshot(`${name}${suffix}.png`, {
		screenshotOptions: {
			animations: 'disabled',
			caret: 'hide',
			scale: 'css',
		},
	})
}

export async function renderVisualPage({
	component,
	path,
	theme = 'light',
	fullHeight = false,
	waitFor,
}: VisualPageOptions) {
	const viewport = currentViewport()
	localStorage.clear()
	document.body.replaceChildren()
	applyThemeToDocument(theme)
	await resizeScreenshotViewport(viewport.width, viewport.height)

	const container = document.body.appendChild(document.createElement('div'))
	container.style.width = '100vw'
	container.style.minHeight = '100vh'

	const screen = await render(createElement(component), {
		container,
		wrapper: createWrapper(path, component),
	})

	// A cold route's first commit can land past the 1s poll default.
	await expect.element(waitFor(screen), { timeout: 3_000 }).toBeVisible()
	await waitForPageIdle()

	return {
		screen,
		expectScreenshot: async (name: string) => {
			if (fullHeight) {
				// Viewport-relative content can keep growing after each resize.
				let height = 0

				for (let i = 0; i < 5; i++) {
					await resizeScreenshotViewport(
						viewport.width,
						Math.max(viewport.height, Math.ceil(container.scrollHeight)),
					)
					await waitForPageIdle()
					const next = Math.ceil(container.scrollHeight)

					if (next === height) break
					height = next
				}
			}

			await expect
				.poll(() =>
					Array.from(container.querySelectorAll('img')).every(
						(image) => image.complete,
					),
				)
				.toBe(true)
			await expectElementScreenshot(screen.locator, name)
		},
	}
}
