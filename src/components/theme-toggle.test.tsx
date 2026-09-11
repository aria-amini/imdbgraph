import { test } from '@config/test/browser'
import { beforeEach, describe, expect } from 'vitest'
import { render } from 'vitest-browser-react'

import { THEME_COOKIE_NAME, THEME_STORAGE_KEY } from '@/lib/theme'

import { ThemeToggle } from './theme-toggle'

function storedCookieValue() {
	const match = document.cookie
		.split('; ')
		.find((entry) => entry.startsWith(`${THEME_COOKIE_NAME}=`))
	return match?.split('=')[1]
}

describe('theme toggle', () => {
	beforeEach(() => {
		localStorage.removeItem(THEME_STORAGE_KEY)
		document.cookie = `${THEME_COOKIE_NAME}=; Max-Age=0; Path=/`
		document.documentElement.classList.remove('dark')
		document.documentElement.style.colorScheme = ''
	})

	test('toggles dark: class, color-scheme, local storage, cookie, aria state', async () => {
		const screen = await render(<ThemeToggle />)
		const control = screen.getByRole('switch', { name: 'Dark mode' })

		expect(control).toHaveAttribute('aria-checked', 'false')

		await control.click()

		expect(document.documentElement.classList.contains('dark')).toBe(true)
		expect(document.documentElement.style.colorScheme).toBe('dark')
		expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
		expect(storedCookieValue()).toBe('dark')
		expect(control).toHaveAttribute('aria-checked', 'true')

		await control.click()

		expect(document.documentElement.classList.contains('dark')).toBe(false)
		expect(document.documentElement.style.colorScheme).toBe('light')
		expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
		expect(storedCookieValue()).toBe('light')
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
