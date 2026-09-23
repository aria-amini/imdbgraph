import { Moon, Sun } from '@phosphor-icons/react/dist/ssr'
import { cn } from 'cn'
import { createContext, useContext, useState, type ReactNode } from 'react'

import { applyThemeToDocument, writeThemeCookie, type Theme } from '@/lib/theme'
import { useBrowserLayoutEffect } from '@/lib/use-browser-layout-effect'

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

/** Segmented sun/moon switch; the knob rides the `.dark` class applied by the
 * pre-hydration theme bootstrap, so the visual state is correct before
 * hydration. */
export function ThemeSwitch({ className }: { className?: string }) {
	const { theme, setThemePreference } = useTheme()

	const toggle = () => setThemePreference(theme === 'dark' ? 'light' : 'dark')

	return (
		<button
			type="button"
			role="switch"
			aria-checked={theme === 'dark'}
			aria-label="Dark mode"
			onClick={toggle}
			className={cn(
				'relative flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 outline-none',
				'bg-input/70 transition-colors motion-reduce:transition-none dark:bg-muted',
				'focus-visible:ring-3 focus-visible:ring-ring/50',
				'before:absolute before:-inset-2.5 before:rounded-md switch-hit-target',
				className,
			)}
		>
			<Moon
				aria-hidden
				className="absolute left-1 size-3 text-white"
				weight="bold"
			/>
			<Sun
				aria-hidden
				className="absolute right-1 size-3 text-white"
				weight="bold"
			/>
			<span
				aria-hidden
				className="ring-border/50 bg-background relative size-5 rounded-full shadow-sm ring-1 transition-transform motion-reduce:transition-none dark:translate-x-5"
			/>
		</button>
	)
}
