import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import {
	type Theme,
	createThemeBootstrapScript,
	setThemePreference,
	getThemePreference,
} from '@/lib/theme'

const THEME_COOKIE_NAME = 'theme'
const THEME_STORAGE_KEY = 'theme'

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
		vi.restoreAllMocks()
		clearStoredTheme()
		vi.unstubAllGlobals()
	})

	test('reads valid cookies and ignores malformed preferences', () => {
		expect(getThemePreference()).toBeNull()
		document.cookie = 'theme=dark; Path=/'
		expect(getThemePreference()).toBe('dark')
		document.cookie = 'theme=invalid; Path=/'
		expect(getThemePreference()).toBeNull()
	})

	describe('setThemePreference', () => {
		test('applies the class and color-scheme for both themes', () => {
			const root = document.documentElement

			setThemePreference('dark')
			expect(root.classList.contains('dark')).toBe(true)
			expect(root.classList.contains('light')).toBe(false)
			expect(root.style.colorScheme).toBe('dark')

			setThemePreference('light')
			expect(root.classList.contains('dark')).toBe(false)
			expect(root.classList.contains('light')).toBe(true)
			expect(root.style.colorScheme).toBe('light')
		})

		test('removes stale theme classes before applying', () => {
			const root = document.documentElement
			root.classList.add('dark', 'light')

			setThemePreference('dark')

			expect(root.classList.contains('light')).toBe(false)
			expect(root.classList.contains('dark')).toBe(true)
		})

		test('saves the choice only in the cookie', () => {
			setThemePreference('dark')

			expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
			expect(storedCookieValue()).toBe('dark')
		})

		test('persists light the same way', () => {
			setThemePreference('light')

			expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
			expect(storedCookieValue()).toBe('light')
		})
	})

	describe('bootstrap script', () => {
		test('keeps the server preference over a conflicting legacy value', () => {
			localStorage.setItem(THEME_STORAGE_KEY, 'light')

			runBootstrapScript('dark')

			expect(document.documentElement.classList.contains('dark')).toBe(true)
			expect(document.documentElement.style.colorScheme).toBe('dark')
		})

		test('migrates a legacy preference and removes it after the cookie is saved', () => {
			localStorage.setItem('theme', 'dark')
			runBootstrapScript(null)
			expect(storedCookieValue()).toBe('dark')
			expect(localStorage.getItem('theme')).toBeNull()
			expect(document.documentElement.classList.contains('dark')).toBe(true)
		})

		test('retains the legacy preference if the browser rejects the cookie', () => {
			localStorage.setItem('theme', 'dark')
			vi.spyOn(document, 'cookie', 'set').mockImplementation(() => {})
			runBootstrapScript(null)
			expect(storedCookieValue()).toBeUndefined()
			expect(localStorage.getItem('theme')).toBe('dark')
			expect(document.documentElement.classList.contains('dark')).toBe(true)
		})

		test('uses the cookie even when localStorage is unavailable', () => {
			document.cookie = 'theme=dark; Path=/'
			vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
				throw new Error('Storage unavailable')
			})
			runBootstrapScript('dark')
			expect(document.documentElement.classList.contains('dark')).toBe(true)
		})

		test('keeps the cookie authoritative and clears obsolete localStorage', () => {
			document.cookie = 'theme=light; Path=/'
			localStorage.setItem('theme', 'dark')
			runBootstrapScript('light')
			expect(storedCookieValue()).toBe('light')
			expect(localStorage.getItem('theme')).toBeNull()
			expect(document.documentElement.classList.contains('light')).toBe(true)
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
			expect(storedCookieValue()).toBeUndefined()
		})
	})
})
