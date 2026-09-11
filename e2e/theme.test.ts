import { expect, test } from '@playwright/test'

const themeCookie = (value: string) => {
	const origin = new URL(
		process.env.BASE_URL ??
			`http://localhost:${process.env.APP_PORT ?? '3000'}`,
	).origin
	return { name: 'theme', value, url: origin }
}

const htmlTagOf = (html: string) => /<html[^>]*>/.exec(html)?.[0] ?? ''

test.describe('theme SSR responses', () => {
	test('dark cookie renders dark html despite a light OS preference', async ({
		playwright,
	}) => {
		const context = await playwright.request.newContext({
			extraHTTPHeaders: { cookie: 'theme=dark' },
		})
		const html = await (await context.get('/')).text()
		const htmlTag = htmlTagOf(html)

		expect(htmlTag).toContain('class="dark"')
		expect(htmlTag).toMatch(/color-scheme:\s*dark/)
		await context.dispose()
	})

	test('light cookie renders light html despite a dark OS preference', async ({
		playwright,
	}) => {
		const context = await playwright.request.newContext({
			extraHTTPHeaders: { cookie: 'theme=light' },
		})
		const html = await (await context.get('/')).text()
		const htmlTag = htmlTagOf(html)

		expect(htmlTag).toContain('class="light"')
		expect(htmlTag).toMatch(/color-scheme:\s*light(?!\s+dark)/)
		await context.dispose()
	})

	test('no cookie leaves the canvas scheme open until the bootstrap resolves', async ({
		request,
	}) => {
		const html = await (await request.get('/')).text()
		const htmlTag = htmlTagOf(html)

		expect(htmlTag).not.toMatch(/class="[^"]*(light|dark)/)
		expect(htmlTag).toMatch(/color-scheme:\s*light\s+dark/)
	})
})

test.describe('theme in the browser', () => {
	test('dark cookie survives hydration against a light OS preference', async ({
		context,
		page,
	}) => {
		await page.emulateMedia({ colorScheme: 'light' })
		await context.addCookies([themeCookie('dark')])

		await page.goto('/')

		const html = page.locator('html')
		await expect(html).toHaveClass(/dark/)
		await expect(html).toHaveCSS('color-scheme', 'dark')
	})

	test('light cookie survives hydration against a dark OS preference', async ({
		context,
		page,
	}) => {
		await page.emulateMedia({ colorScheme: 'dark' })
		await context.addCookies([themeCookie('light')])

		await page.goto('/')

		const html = page.locator('html')
		await expect(html).toHaveClass(/light/)
		await expect(html).toHaveCSS('color-scheme', 'light')
	})

	test('first visits resolve the OS preference before content', async ({
		context,
		page,
	}) => {
		await context.clearCookies()

		await page.emulateMedia({ colorScheme: 'dark' })
		await page.goto('/')
		await expect(page.locator('html')).toHaveClass(/dark/)

		await page.emulateMedia({ colorScheme: 'light' })
		await page.goto('/')
		await expect(page.locator('html')).toHaveClass(/light/)
	})

	test('the not-found document keeps the themed shell', async ({
		context,
		page,
	}) => {
		await page.emulateMedia({ colorScheme: 'light' })
		await context.addCookies([themeCookie('dark')])

		await page.goto('/no-such-page')

		await expect(
			page.getByRole('heading', { name: 'Page not found' }),
		).toBeVisible()
		await expect(page.locator('html')).toHaveClass(/dark/)
		await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark')
	})
})
