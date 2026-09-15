import { cn } from 'cn'
import type { ReactNode } from 'react'

import { SearchNavbar } from '@/components/navbar'

type PageWidth = 'narrow' | 'wide'

const MAIN_CLASS: Record<PageWidth, string> = {
	narrow: 'max-w-3xl px-4 py-10 sm:px-6',
	wide: 'max-w-5xl px-4 py-6 md:px-6 lg:px-8 lg:py-8',
}

/** Navbar plus a centered main column for content pages. */
export function Page({
	width,
	busy = false,
	children,
}: {
	width: PageWidth
	busy?: boolean
	children: ReactNode
}) {
	return (
		<>
			<SearchNavbar />
			<main
				aria-busy={busy || undefined}
				className={cn('mx-auto w-full', MAIN_CLASS[width])}
			>
				{children}
			</main>
		</>
	)
}
