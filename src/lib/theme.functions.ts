import { createServerFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'

import { THEME_COOKIE_NAME, parseTheme, type Theme } from './theme'

/** Returns the validated theme cookie for the current request, or null when
 * absent or malformed. Runs on the server during SSR; client navigations
 * resolve it over the server-function RPC. */
export const getStoredTheme = createServerFn().handler(
	async (): Promise<Theme | null> => {
		try {
			return parseTheme(getCookie(THEME_COOKIE_NAME))
		} catch {
			return null
		}
	},
)
