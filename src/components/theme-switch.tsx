import { cn } from 'cn'
import {
	createContext,
	createEffect,
	createSignal,
	onMount,
	useContext,
	type Accessor,
	type JSX,
} from 'solid-js'

import { MoonBold, SunBold } from '@/components/icons'
import { applyThemeToDocument, writeThemeCookie, type Theme } from '@/lib/theme'

const ThemeContext = createContext<{
	theme: Accessor<Theme>
	setThemePreference: (theme: Theme) => void
}>()

export function ThemeProvider(props: {
	preference: Theme | null
	children: JSX.Element
}) {
	const [theme, setThemeState] = createSignal<Theme>(
		props.preference ?? 'light',
	)

	const [mounted, setMounted] = createSignal(false)

	onMount(() => {
		// Adopt the bootstrap result, including OS detection and legacy migration.
		setThemeState(
			document.documentElement.classList.contains('dark') ? 'dark' : 'light',
		)
		setMounted(true)
	})

	createEffect(() => {
		if (!mounted()) return
		applyThemeToDocument(theme())
	})

	function setThemePreference(next: Theme) {
		writeThemeCookie(next)
		setThemeState(next)
	}

	return (
		<ThemeContext.Provider value={{ theme, setThemePreference }}>
			{props.children}
		</ThemeContext.Provider>
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
export function ThemeSwitch(props: { class?: string }) {
	const { theme, setThemePreference } = useTheme()

	const toggle = () => setThemePreference(theme() === 'dark' ? 'light' : 'dark')

	return (
		<button
			type="button"
			role="switch"
			aria-checked={theme() === 'dark'}
			aria-label="Dark mode"
			onClick={toggle}
			class={cn(
				'relative flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 outline-none',
				'bg-input/70 transition-colors motion-reduce:transition-none dark:bg-muted',
				'focus-visible:ring-3 focus-visible:ring-ring/50',
				'before:absolute before:-inset-2.5 before:rounded-md before:content-[""]',
				props.class,
			)}
		>
			<MoonBold aria-hidden class="absolute left-1 size-3 text-white" />
			<SunBold aria-hidden class="absolute right-1 size-3 text-white" />
			<span
				aria-hidden
				class="ring-border/50 bg-background relative size-5 rounded-full shadow-sm ring-1 transition-transform motion-reduce:transition-none dark:translate-x-5"
			/>
		</button>
	)
}
