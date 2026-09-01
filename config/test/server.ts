import { setupServer } from 'msw/node'
import { afterEach, beforeEach, describe, expect, test as baseTest, vi } from 'vite-plus/test'

type Server = ReturnType<typeof setupServer>
const server: Server = setupServer()

const test = baseTest.extend<{ server: Server; _cleanup: void }>({
	server: [
		async ({}, use) => {
			server.listen({ onUnhandledRequest: 'bypass' })
			await use(server)
			server.close()
		},
		{ auto: true, scope: 'worker' },
	],
	_cleanup: [
		async ({ server }: { server: Server }, use: (value: void) => Promise<void>) => {
			await use()
			server.resetHandlers()
		},
		{ auto: true },
	],
})

export { afterEach, beforeEach, describe, expect, test, vi }
