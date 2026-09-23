import { setupWorker } from 'msw/browser'
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	test as baseTest,
	vi,
} from 'vite-plus/test'
import { page } from 'vite-plus/test/browser'

import handlers from '@/mocks/handlers'

type Worker = ReturnType<typeof setupWorker>
let worker: Worker | undefined

const test = baseTest.extend<{ worker: Worker; _cleanup: void }>({
	worker: [
		async ({}, use) => {
			worker ??= setupWorker(...handlers)
			await worker.start({ quiet: true, onUnhandledRequest: 'bypass' })
			await use(worker)
			worker.stop()
		},
		{ auto: true, scope: 'worker' },
	],
	_cleanup: [
		async (
			{ worker }: { worker: Worker },
			use: (value: void) => Promise<void>,
		) => {
			const viewport = {
				width: window.innerWidth,
				height: window.innerHeight,
			}
			await use()
			// Layout variants read the viewport once at import time; restore
			// the pinned size so a leaked resize cannot flip that selection.
			await page.viewport(viewport.width, viewport.height)
			worker.resetHandlers(...handlers)
			vi.restoreAllMocks()
		},
		{ auto: true },
	],
})

// The mobile layout is defined by Tailwind's `md` breakpoint. The CSS
// variable is the source of truth; the fallback restates its default.
function usesMobileLayout() {
	const md =
		getComputedStyle(document.documentElement)
			.getPropertyValue('--breakpoint-md')
			.trim() || '48rem'
	return window.matchMedia(`(width < ${md})`).matches
}

const mobileTest = test.skipIf(!usesMobileLayout())
const desktopTest = test.skipIf(usesMobileLayout())

export {
	afterEach,
	beforeEach,
	describe,
	desktopTest,
	expect,
	mobileTest,
	test,
	vi,
}
