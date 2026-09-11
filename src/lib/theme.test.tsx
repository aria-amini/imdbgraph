import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import {
	type Theme,
	THEME_COOKIE_NAME,
	THEME_STORAGE_KEY,
	applyTheme,
	createThemeBootstrapScript,
	parseTheme,
	persistTheme,
} from '@/lib/theme'

function clearStoredTheme() {
	localStorage.removeItem(THEME_STORAGE_KEY)
	document.cookie = `${THEME_COOKIE_NAME}=; Max-Age=0; Path=/`
	document.documentElement.classList.remove('light', 'dark')
	document.documentElement.style.colorScheme = ''
}

function storedCookieValue() {
	const match = document.cookie
		.split('; ')
		.find((entry) => entry.startsWith(`${THEME_COOKIE_NAME}=`))
	return match?.split('=')[1]
}

function runBootstrapScript(serverTheme: Theme | null) {
	const script = document.createElement('script')
	script.textContent = createThemeBootstrapScript(serverTheme)
	document.head.append(script)
	script.remove()
}

describe('theme helpers', () => {
	beforeEach(clearStoredTheme)
	afterEach(() => {
		clearStoredTheme()
		vi.unstubAllGlobals()
	})

	describe('parseTheme', () => {
		test('accepts only light and dark', () => {
			expect(parseTheme('light')).toBe('light')
			expect(parseTheme('dark')).toBe('dark')
		})

		test('treats every other value as absent', () => {
			expect(parseTheme('system')).toBeNull()
			expect(parseTheme('DARK')).toBeNull()
			expect(parseTheme('')).toBeNull()
			expect(parseTheme(undefined)).toBeNull()
			expect(parseTheme(null)).toBeNull()
		})
	})

	describe('applyTheme', () => {
		test('applies the class and color-scheme for both themes', () => {
			const root = document.documentElement

			applyTheme('dark')
			expect(root.classList.contains('dark')).toBe(true)
			expect(root.classList.contains('light')).toBe(false)
			expect(root.style.colorScheme).toBe('dark')

			applyTheme('light')
			expect(root.classList.contains('dark')).toBe(false)
			expect(root.classList.contains('light')).toBe(true)
			expect(root.style.colorScheme).toBe('light')
		})

		test('removes stale theme classes before applying', () => {
			const root = document.documentElement
			root.classList.add('dark', 'light')

			applyTheme('dark')

			expect(root.classList.contains('light')).toBe(false)
			expect(root.classList.contains('dark')).toBe(true)
		})
	})

	describe('persistTheme', () => {
		test('writes the choice to local storage and the cookie', () => {
			persistTheme('dark')

			expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
			expect(storedCookieValue()).toBe('dark')
		})

		test('persists light the same way', () => {
			persistTheme('light')

			expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
			expect(storedCookieValue()).toBe('light')
		})
	})

	describe('bootstrap script', () => {
		test('prefers a valid local-storage value over the server theme', () => {
			localStorage.setItem(THEME_STORAGE_KEY, 'light')

			runBootstrapScript('dark')

			expect(document.documentElement.classList.contains('light')).toBe(true)
			expect(document.documentElement.style.colorScheme).toBe('light')
		})

		test('falls back to the server theme without local storage', () => {
			runBootstrapScript('dark')

			expect(document.documentElement.classList.contains('dark')).toBe(true)
			expect(document.documentElement.style.colorScheme).toBe('dark')
		})

		test('ignores invalid stored values', () => {
			localStorage.setItem(THEME_STORAGE_KEY, 'blue')

			runBootstrapScript(null)

			expect(document.documentElement.classList.contains('dark')).toBe(false)
			expect(document.documentElement.classList.contains('light')).toBe(true)
		})

		test('resolves the OS preference as the last resort', () => {
			vi.stubGlobal('matchMedia', (query: string) => ({
				matches: query.includes('dark'),
			}))

			runBootstrapScript(null)

			expect(document.documentElement.classList.contains('dark')).toBe(true)
			expect(document.documentElement.style.colorScheme).toBe('dark')
		})
	})
})
