import { test, expect } from '@config/test/browser'
import { http, HttpResponse } from 'msw'
import { page, userEvent } from 'vite-plus/test/browser'
import { render } from 'vitest-browser-react'

import { FeedbackDialog } from './feedback-dialog'

test('submits feedback with an optional email', async ({ worker }) => {
	const submissions: Array<unknown> = []
	worker.use(
		http.post('/api/feedback', async ({ request }) => {
			submissions.push(await request.json())
			return HttpResponse.json(null, { status: 201 })
		}),
	)

	const screen = await render(<FeedbackDialog />)

	await userEvent.click(screen.getByRole('button', { name: 'Feedback' }))
	await userEvent.fill(
		screen.getByRole('textbox', { name: 'Feedback' }),
		'Love the episode grid',
	)
	await userEvent.click(screen.getByRole('button', { name: 'Send' }))

	await expect.element(screen.getByText(/Thanks/)).toBeVisible()
	expect(submissions).toEqual([{ message: 'Love the episode grid', email: '' }])
})

test('send stays disabled until a message is entered', async () => {
	const screen = await render(<FeedbackDialog />)

	await userEvent.click(screen.getByRole('button', { name: 'Feedback' }))

	expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()

	await userEvent.fill(screen.getByRole('textbox', { name: 'Feedback' }), 'Hi')
	expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled()
})

test('dialog inputs keep a 16px mobile font size to prevent focus zoom', async () => {
	const originalWidth = window.innerWidth
	const originalHeight = window.innerHeight
	try {
		await page.viewport(375, 812)
		const screen = await render(<FeedbackDialog />)

		await userEvent.click(screen.getByRole('button', { name: 'Feedback' }))

		const textarea = screen.getByRole('textbox', { name: 'Feedback' })
		await expect.element(textarea).toBeVisible()
		await expect
			.poll(() => getComputedStyle(textarea.element()).fontSize)
			.toBe('16px')

		const email = screen.getByRole('textbox', { name: 'Contact email' })
		await expect
			.poll(() => getComputedStyle(email.element()).fontSize)
			.toBe('16px')
	} finally {
		await page.viewport(originalWidth, originalHeight)
	}
})
