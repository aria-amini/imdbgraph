export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'theme'
export const THEME_COOKIE_NAME = 'theme'

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

export function parseTheme(value: unknown): Theme | null {
	return value === 'light' || value === 'dark' ? value : null
}

export function applyTheme(theme: Theme): void {
	const root = document.documentElement
	root.classList.remove('light', 'dark')
	root.classList.add(theme)
	root.style.colorScheme = theme
}

export function persistTheme(theme: Theme): void {
	try {
		localStorage.setItem(THEME_STORAGE_KEY, theme)
	} catch {
		// Storage can be unavailable (private mode, quota); the cookie below
		// still records the choice for SSR.
	}
	const secure = location.protocol === 'https:' ? '; Secure' : ''
	document.cookie = `${THEME_COOKIE_NAME}=${theme}; Path=/; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE_SECONDS}${secure}`
}

/** Runs before paint: local storage wins, then the cookie the server saw,
 * then the OS setting. Values are validated inline so untrusted cookie or
 * storage content never reaches the DOM. */
export function createThemeBootstrapScript(serverTheme: Theme | null): string {
	const serverKnown = JSON.stringify(serverTheme)
	return `(function(){var e=document.documentElement,t=null;try{var s=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(s==='light'||s==='dark')t=s}catch(c){}if(!t){var f=${serverKnown};if(f==='light'||f==='dark')t=f}if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}e.classList.remove('light','dark');e.classList.add(t);e.style.colorScheme=t})()`
}
