import { setupWorker } from 'msw/browser'
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	test as baseTest,
	vi,
} from 'vite-plus/test'

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
			await use()
			worker.resetHandlers(...handlers)
		},
		{ auto: true },
	],
})

export { afterEach, beforeEach, describe, expect, test, vi }
