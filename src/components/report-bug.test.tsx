import { test, expect } from '@config/test/browser'
import { page, userEvent } from 'vite-plus/test/browser'
import { render } from 'vitest-browser-react'

import { ReportBug } from './report-bug'

test('dialog inputs keep a 16px mobile font size to prevent focus zoom', async () => {
	const originalWidth = window.innerWidth
	const originalHeight = window.innerHeight
	try {
		await page.viewport(375, 812)
		const screen = await render(<ReportBug />)

		await userEvent.click(screen.getByRole('button', { name: 'Report a bug' }))

		const textarea = page.getByRole('textbox', { name: 'Bug description' })
		await expect.element(textarea).toBeVisible()
		await expect
			.poll(() => getComputedStyle(textarea.element()).fontSize)
			.toBe('16px')

		const email = page.getByRole('textbox', { name: 'Contact email' })
		await expect
			.poll(() => getComputedStyle(email.element()).fontSize)
			.toBe('16px')
	} finally {
		await page.viewport(originalWidth, originalHeight)
	}
})
