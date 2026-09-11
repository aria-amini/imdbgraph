'use client'

import { cn } from 'cn'
import { useEffect, useState } from 'react'

import { Block } from '@/components/block'
import { Graph } from '@/components/graph'
import { ShowHeader } from '@/components/show-header'
import type { Ratings } from '@/lib/imdb/types'

export type View = 'blocks' | 'graph'

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
						'px-3 py-1.5 font-mono text-[11px] font-bold tracking-widest uppercase transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-wait disabled:opacity-50',
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

export function RatingsView({ ratings }: { ratings: Ratings }) {
	const [view, setView] = useState<View>('blocks')
	const [isHydrated, setIsHydrated] = useState(false)

	useEffect(() => {
		setIsHydrated(true)
	}, [])

	const toolbar = (
		<ViewToggle view={view} onViewChange={setView} disabled={!isHydrated} />
	)

	return (
		<div>
			<ShowHeader ratings={ratings} />
			{view === 'blocks' ? (
				<Block ratings={ratings} toolbar={toolbar} />
			) : (
				<Graph ratings={ratings} toolbar={toolbar} />
			)}
		</div>
	)
}
