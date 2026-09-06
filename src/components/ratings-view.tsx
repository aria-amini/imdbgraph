'use client'

import { cn } from 'cn'
import { useEffect, useState } from 'react'

import { Block } from '@/components/block'
import { Graph } from '@/components/graph'
import { ShowHeader } from '@/components/show-header'
import type { ShowImage } from '@/lib/images/thumbnail'
import type { Ratings } from '@/lib/imdb/types'

type View = 'blocks' | 'graph'

function ViewToggle({
	view,
	onViewChange,
	disabled,
}: {
	view: View
	onViewChange: (view: View) => void
	disabled: boolean
}) {
	return (
		<fieldset className="border-border flex border p-0.5">
			<legend className="sr-only">Ratings view</legend>
			{(['blocks', 'graph'] as const).map((option) => (
				<button
					key={option}
					type="button"
					aria-pressed={view === option}
					disabled={disabled}
					onClick={() => onViewChange(option)}
					className={cn(
						'px-2.5 py-1 font-mono text-[10px] font-bold tracking-widest uppercase transition-colors focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-50',
						view === option
							? 'bg-foreground text-background'
							: 'text-muted-foreground hover:bg-muted hover:text-foreground',
					)}
				>
					{option}
				</button>
			))}
		</fieldset>
	)
}

export function RatingsView({
	ratings,
	image,
}: {
	ratings: Ratings
	image: ShowImage | null
}) {
	const [view, setView] = useState<View>('blocks')
	const [isHydrated, setIsHydrated] = useState(false)

	useEffect(() => {
		setIsHydrated(true)
	}, [])

	return (
		<div>
			<ShowHeader
				ratings={ratings}
				image={image}
				action={
					<ViewToggle
						view={view}
						onViewChange={setView}
						disabled={!isHydrated}
					/>
				}
			/>
			{view === 'blocks' ? (
				<Block ratings={ratings} />
			) : (
				<Graph ratings={ratings} />
			)}
		</div>
	)
}
