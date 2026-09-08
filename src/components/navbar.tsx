import { House } from '@phosphor-icons/react/dist/ssr'
import { Link, useLocation } from '@tanstack/react-router'
import { cn } from 'cn'
import type { ReactNode } from 'react'

import { buttonVariants } from './ui/button'

interface NavbarProps {
	center?: ReactNode
}

/** Renders the shared navigation bar and optional centered content. */
export function Navbar({ center }: NavbarProps) {
	const { pathname } = useLocation()
	const isHome = pathname === '/'
	if (isHome && !center) return null

	return (
		<nav
			className={cn(
				'relative flex items-center gap-2 border-b px-4 py-3 md:px-6 lg:px-8',
			)}
		>
			{!isHome && (
				<Link
					to="/"
					aria-label="Home"
					className={cn(
						buttonVariants({ variant: 'outline', size: 'icon' }),
						'size-11 justify-self-start md:absolute md:left-6 md:top-1/2 md:z-10 md:size-8 md:-mt-4 lg:left-8',
					)}
				>
					<House weight="bold" aria-hidden="true" />
				</Link>
			)}
			{center && <div className={cn('min-w-0 flex-1')}>{center}</div>}
		</nav>
	)
}
