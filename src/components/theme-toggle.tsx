import { Moon, Sun } from '@phosphor-icons/react/dist/ssr'
import { cn } from 'cn'
import { useEffect, useState } from 'react'

/** Segmented sun/moon switch; the knob rides the `.dark` class set by
 * `themeInitScript`, so the visual state is correct before hydration. */
export function ThemeToggle({ className }: { className?: string }) {
	const [isDark, setIsDark] = useState(false)

	useEffect(() => {
		setIsDark(document.documentElement.classList.contains('dark'))
	}, [])

	const toggle = () => {
		const dark = !document.documentElement.classList.contains('dark')
		document.documentElement.classList.toggle('dark', dark)
		localStorage.setItem('theme', dark ? 'dark' : 'light')
		setIsDark(dark)
	}

	return (
		<button
			type="button"
			role="switch"
			aria-checked={isDark}
			aria-label="Dark mode"
			onClick={toggle}
			className={cn(
				'relative flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 outline-none',
				'bg-input/70 transition-colors dark:bg-muted',
				'focus-visible:ring-3 focus-visible:ring-ring/50',
				'before:absolute before:-inset-2.5 before:rounded-md before:content-[""]',
				className,
			)}
		>
			<Moon
				aria-hidden
				className="text-muted-foreground absolute left-1 size-3"
				weight="bold"
			/>
			<Sun
				aria-hidden
				className="text-muted-foreground absolute right-1 size-3"
				weight="bold"
			/>
			<span
				aria-hidden
				className="ring-border/50 bg-background size-5 rounded-full shadow-sm ring-1 transition-transform dark:translate-x-5"
			/>
		</button>
	)
}
