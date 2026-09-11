import {
	createContext,
	useContext,
	useEffect,
	useLayoutEffect,
	useState,
	type ReactNode,
} from 'react'

import { applyThemeToDocument, writeThemeCookie, type Theme } from '@/lib/theme'

// Avoid layout-effect warnings during SSR; synchronize before paint in the browser.
const useBrowserLayoutEffect =
	typeof window === 'undefined' ? useEffect : useLayoutEffect

const ThemeContext = createContext<{
	theme: Theme
	setThemePreference: (theme: Theme) => void
} | null>(null)

export function ThemeProvider({
	preference,
	children,
}: {
	preference: Theme | null
	children: ReactNode
}) {
	const [theme, setThemeState] = useState<Theme>(preference ?? 'light')
	const [mounted, setMounted] = useState(false)

	useBrowserLayoutEffect(() => {
		// Adopt the bootstrap result, including OS detection and legacy migration.
		setThemeState(
			document.documentElement.classList.contains('dark') ? 'dark' : 'light',
		)
		setMounted(true)
	}, [])

	useBrowserLayoutEffect(() => {
		if (!mounted) return
		applyThemeToDocument(theme)
	}, [theme, mounted])

	function setThemePreference(next: Theme) {
		writeThemeCookie(next)
		setThemeState(next)
	}

	return (
		<ThemeContext value={{ theme, setThemePreference }}>
			{children}
		</ThemeContext>
	)
}

export function useTheme() {
	const context = useContext(ThemeContext)
	if (!context) throw new Error('useTheme must be used within ThemeProvider')
	return context
}
