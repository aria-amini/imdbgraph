import { createServerFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'

import { THEME_COOKIE_NAME, parseTheme, type Theme } from './theme'

/** Returns the validated theme cookie for the current request, or null when
 * absent or malformed. Server-side only: the client reads document.cookie
 * through loadStoredTheme instead, so navigations avoid the RPC. */
export const getStoredTheme = createServerFn().handler(
	async (): Promise<Theme | null> => {
		try {
			return parseTheme(getCookie(THEME_COOKIE_NAME))
		} catch {
			return null
		}
	},
)

/** Resolves the stored theme for the current document. The server reads the
 * request cookie during SSR; the client reads document.cookie, which
 * persistTheme keeps in sync, so client navigations make no server call. */
export async function loadStoredTheme(): Promise<Theme | null> {
	if (!import.meta.env.SSR) {
		const cookie = document.cookie
			.split('; ')
			.find((entry) => entry.startsWith(`${THEME_COOKIE_NAME}=`))
			?.split('=')[1]
		return parseTheme(cookie)
	}
	return getStoredTheme()
}
