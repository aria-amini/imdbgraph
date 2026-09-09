import { House } from '@phosphor-icons/react/dist/ssr'
import { cn } from 'cn'
import type { ReactNode } from 'react'

import { buttonVariants } from './ui/button'

interface NavbarProps {
	center?: ReactNode
}

/** Renders the shared navigation bar and optional centered content. */
export function Navbar({ center }: NavbarProps) {
	return (
		<nav className="grid grid-cols-[1fr_minmax(0,28rem)_1fr] items-center gap-2 border-b px-4 py-3 md:px-6">
			<a
				href="/"
				aria-label="Home"
				className={cn(
					buttonVariants({ variant: 'outline', size: 'icon' }),
					'size-11 justify-self-start md:size-8',
				)}
			>
				<House weight="bold" aria-hidden="true" />
			</a>
			{center && <div className="col-start-2 w-full">{center}</div>}
		</nav>
	)
}
