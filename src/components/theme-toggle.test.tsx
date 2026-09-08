import { test } from '@config/test/browser'
import { beforeEach, describe, expect } from 'vitest'
import { render } from 'vitest-browser-react'

import { ThemeToggle } from './theme-toggle'

describe('theme toggle', () => {
	beforeEach(() => {
		localStorage.removeItem('theme')
		document.documentElement.classList.remove('dark')
	})

	test('toggles the dark class, stores the choice, and syncs aria state', async () => {
		const screen = await render(<ThemeToggle />)
		const control = screen.getByRole('switch', { name: 'Dark mode' })

		expect(control).toHaveAttribute('aria-checked', 'false')

		await control.click()

		expect(document.documentElement.classList.contains('dark')).toBe(true)
		expect(localStorage.getItem('theme')).toBe('dark')
		expect(control).toHaveAttribute('aria-checked', 'true')

		await control.click()

		expect(document.documentElement.classList.contains('dark')).toBe(false)
		expect(localStorage.getItem('theme')).toBe('light')
		expect(control).toHaveAttribute('aria-checked', 'false')
	})

	test('renders both mode icons and a sliding knob', async () => {
		const screen = await render(<ThemeToggle />)

		const control = screen.getByRole('switch', { name: 'Dark mode' })
		await expect.element(control).toBeVisible()
		expect(control.element().querySelectorAll('svg').length).toBe(2)
	})

	test('theme class drives the browser color-scheme', () => {
		const root = document.documentElement

		root.classList.remove('dark')
		expect(getComputedStyle(root).colorScheme).toBe('light')

		root.classList.add('dark')
		expect(getComputedStyle(root).colorScheme).toBe('dark')

		root.classList.remove('dark')
		expect(getComputedStyle(root).colorScheme).toBe('light')
	})
})
