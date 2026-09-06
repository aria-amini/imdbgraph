import { cn } from 'cn'
import { Home } from 'lucide-react'
import type { ReactNode } from 'react'

import { buttonVariants } from './ui/button'

interface NavbarProps {
	center?: ReactNode
}

/** Renders the shared navigation bar and optional centered content. */
export function Navbar({ center }: NavbarProps) {
	return (
		<nav className={cn('flex items-center gap-2 border-b px-4 py-3 md:px-6')}>
			<a
				href="/"
				className={cn(
					buttonVariants({ variant: 'outline', size: 'icon' }),
					'size-11 justify-self-start md:size-8',
				)}
			>
				<Home />
			</a>
			{center && <div className={cn('min-w-0 flex-1')}>{center}</div>}
		</nav>
	)
}
