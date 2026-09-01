import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
	RouterContextProvider,
	createRootRoute,
	createRoute,
	createRouter,
} from '@tanstack/react-router'
import { expect } from 'vite-plus/test'
import { page } from 'vite-plus/test/browser'
import { createElement } from 'react'
import { render } from 'vitest-browser-react'
import type { ComponentType, ReactNode } from 'react'
import type { Locator } from 'vite-plus/test/browser'
import type { RenderResult } from 'vitest-browser-react'

interface Viewport {
	width: number
	height: number
}

interface VisualPageOptions {
	component: ComponentType
	path: string
	name: string
	waitFor: (screen: RenderResult) => Locator
	setup?: () => void | Promise<void>
	prepare?: (screen: RenderResult) => void | Promise<void>
	viewport?: Viewport
	soft?: boolean
}

interface RenderedVisualPage {
	screen: RenderResult
	container: HTMLDivElement
	viewport: Viewport
	expectScreenshot: (
		name: string,
		options?: { soft?: boolean },
	) => Promise<void>
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

async function waitForPageIdle() {
	await document.fonts.ready
	await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
	await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
}

async function expectScreenshot(
	screen: RenderResult,
	name: string,
	{ soft = false }: { soft?: boolean } = {},
) {
	const options = { screenshotOptions: { scale: 'css' } } as const
	if (soft) {
		await expect
			.soft(screen.locator, `${name} page screenshot`)
			.toMatchScreenshot(`${name}.png`, options)
		return
	}

	await expect.element(screen.locator).toMatchScreenshot(`${name}.png`, options)
}

export async function renderVisualPage({
	component,
	path,
	waitFor,
	setup,
	prepare,
	viewport = { width: 1280, height: 720 },
}: Omit<VisualPageOptions, 'name' | 'soft'>): Promise<RenderedVisualPage> {
	localStorage.clear()
	document.body.replaceChildren()
	await setup?.()
	await page.viewport(viewport.width, viewport.height)

	const container = document.body.appendChild(document.createElement('div'))
	container.style.width = '100vw'
	container.style.minHeight = '100vh'

	const screen = await render(createElement(component), {
		container,
		wrapper: createWrapper(path, component),
	})

	await prepare?.(screen)
	await expect.element(waitFor(screen)).toBeVisible()
	await waitForPageIdle()

	return {
		screen,
		container,
		viewport,
		expectScreenshot: async (screenshotName, options) => {
			await page.viewport(viewport.width, Math.ceil(container.scrollHeight))
			await waitForPageIdle()
			await expectScreenshot(screen, screenshotName, options)
		},
	}
}

export async function expectPageScreenshot({
	name,
	soft,
	...options
}: VisualPageOptions) {
	const visualPage = await renderVisualPage(options)
	await visualPage.expectScreenshot(name, soft ? { soft } : undefined)
}
