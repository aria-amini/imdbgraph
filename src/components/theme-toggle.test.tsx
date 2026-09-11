import { test } from '@config/test/browser'
import { afterEach, beforeEach, describe, expect, vi } from 'vitest'
import { render } from 'vitest-browser-react'

import { createThemeBootstrapScript } from '@/lib/theme'

import { ThemeProvider } from './theme-provider'
import { ThemeToggle } from './theme-toggle'

const THEME_COOKIE_NAME = 'theme'
const THEME_STORAGE_KEY = 'theme'

function storedCookieValue() {
	const match = document.cookie
		.split('; ')
		.find((entry) => entry.startsWith(`${THEME_COOKIE_NAME}=`))
	return match?.split('=')[1]
}

describe('theme toggle', () => {
	afterEach(() => vi.unstubAllGlobals())
	beforeEach(() => {
		localStorage.removeItem(THEME_STORAGE_KEY)
		document.cookie = `${THEME_COOKIE_NAME}=; Max-Age=0; Path=/`
		document.documentElement.classList.remove('light', 'dark')
		document.documentElement.style.colorScheme = ''
	})

	test('toggles dark: class, color-scheme, cookie, aria state', async () => {
		const screen = await render(
			<ThemeProvider preference={null}>
				<ThemeToggle />
			</ThemeProvider>,
		)
		const control = screen.getByRole('switch', { name: 'Dark mode' })

		expect(control).toHaveAttribute('aria-checked', 'false')

		await control.click()

		expect(document.documentElement.classList.contains('dark')).toBe(true)
		expect(document.documentElement.style.colorScheme).toBe('dark')
		expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
		expect(storedCookieValue()).toBe('dark')
		expect(control).toHaveAttribute('aria-checked', 'true')

		await control.click()

		expect(document.documentElement.classList.contains('dark')).toBe(false)
		expect(document.documentElement.style.colorScheme).toBe('light')
		expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
		expect(storedCookieValue()).toBe('light')
		expect(control).toHaveAttribute('aria-checked', 'false')
	})

	test('the first toggle on an OS-dark visit selects light', async () => {
		vi.stubGlobal('matchMedia', () => ({ matches: true }))
		const script = document.createElement('script')
		script.textContent = createThemeBootstrapScript(null)
		document.head.append(script)
		script.remove()

		const screen = await render(
			<ThemeProvider preference={null}>
				<ThemeToggle />
			</ThemeProvider>,
		)
		const control = screen.getByRole('switch', { name: 'Dark mode' })
		expect(control).toHaveAttribute('aria-checked', 'true')
		expect(document.documentElement.style.colorScheme).toBe('dark')
		expect(storedCookieValue()).toBeUndefined()

		await control.click()

		expect(control).toHaveAttribute('aria-checked', 'false')
		expect(document.documentElement.classList.contains('light')).toBe(true)
		expect(document.documentElement.style.colorScheme).toBe('light')
		expect(storedCookieValue()).toBe('light')
	})

	test('keeps multiple consumers synchronized with the bootstrap theme', async () => {
		document.documentElement.classList.add('dark')
		const screen = await render(
			<ThemeProvider preference={null}>
				<ThemeToggle />
				<ThemeToggle />
			</ThemeProvider>,
		)
		const switches = screen.getByRole('switch', { name: 'Dark mode' })
		await expect
			.element(switches.nth(0))
			.toHaveAttribute('aria-checked', 'true')
		await expect
			.element(switches.nth(1))
			.toHaveAttribute('aria-checked', 'true')
		expect(storedCookieValue()).toBeUndefined()
		expect(document.documentElement.classList.contains('dark')).toBe(true)
		await switches.nth(0).click()
		await expect
			.element(switches.nth(0))
			.toHaveAttribute('aria-checked', 'false')
		await expect
			.element(switches.nth(1))
			.toHaveAttribute('aria-checked', 'false')
		expect(storedCookieValue()).toBe('light')
	})

	test('renders both mode icons and a sliding knob', async () => {
		const screen = await render(
			<ThemeProvider preference={null}>
				<ThemeToggle />
			</ThemeProvider>,
		)

		const control = screen.getByRole('switch', { name: 'Dark mode' })
		await expect.element(control).toBeVisible()
		expect(control.element().querySelectorAll('svg').length).toBe(2)
	})

	test('theme class drives the browser color-scheme', () => {
		const root = document.documentElement

		root.classList.remove('light', 'dark')
		expect(getComputedStyle(root).colorScheme).toBe('light')

		root.classList.add('dark')
		expect(getComputedStyle(root).colorScheme).toBe('dark')

		root.classList.remove('light', 'dark')
		expect(getComputedStyle(root).colorScheme).toBe('light')
	})
})
