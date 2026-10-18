import { Link } from '@tanstack/solid-router'
import { cn } from 'cn'
import type { JSX } from 'solid-js'

import { HouseBold } from '@/components/icons'
import { SearchBar } from '@/components/search-bar'
import { buttonVariants } from '@/components/ui/button'

type PageWidth = 'narrow' | 'wide'

const MAIN_CLASS: Record<PageWidth, string> = {
	narrow: 'max-w-3xl px-4 py-10 sm:px-6',
	wide: 'max-w-5xl px-4 py-6 md:px-6 lg:px-8 lg:py-8',
}

/** Shared nav plus a centered main column for content pages. */
export function Page(props: {
	width: PageWidth
	busy?: boolean
	children: JSX.Element
}) {
	return (
		<>
			<nav class="relative flex items-center gap-2 border-b px-4 py-3 md:px-6 lg:px-8">
				<Link
					to="/"
					aria-label="Home"
					class={cn(
						buttonVariants({ variant: 'outline', size: 'icon' }),
						'size-11 justify-self-start md:absolute md:left-6 md:top-1/2 md:z-10 md:size-8 md:-mt-4 lg:left-8',
					)}
				>
					<HouseBold aria-hidden="true" />
				</Link>
				<div class="min-w-0 flex-1">
					<SearchBar class="w-full md:mx-auto md:max-w-md" variant="navbar" />
				</div>
			</nav>
			<main
				aria-busy={props.busy || undefined}
				class={cn('mx-auto w-full', MAIN_CLASS[props.width])}
			>
				{props.children}
			</main>
		</>
	)
}
