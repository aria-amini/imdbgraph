import {
	createContext,
	useContext,
	useEffect,
	useState,
	type ReactNode,
} from 'react'

import {
	setThemePreference as updateThemePreference,
	type Theme,
} from '@/lib/theme'

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
	const [theme, setTheme] = useState<Theme>(preference ?? 'light')

	useEffect(() => {
		// Adopt the bootstrap result, including OS detection and legacy migration.
		setTheme(
			document.documentElement.classList.contains('dark') ? 'dark' : 'light',
		)
	}, [])

	function setThemePreference(next: Theme) {
		updateThemePreference(next)
		setTheme(next)
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
