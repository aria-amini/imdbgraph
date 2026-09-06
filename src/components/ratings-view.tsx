'use client'

import { cn } from 'cn'
import { useEffect, useState } from 'react'

import { Block } from '@/components/block'
import { Graph } from '@/components/graph'
import type { ShowImage } from '@/lib/images/thumbnail'
import type { Ratings } from '@/lib/imdb/types'

type View = 'blocks' | 'graph'

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
			<div className="mb-3 flex items-start justify-between gap-4">
				{image ? (
					<img
						src={image.url}
						alt={`${ratings.show.title} poster`}
						width={image.width ?? undefined}
						height={image.height ?? undefined}
						className="h-48 w-auto rounded-md border border-border"
					/>
				) : (
					<span aria-hidden />
				)}
				<fieldset className={cn('flex border border-border p-0.5')}>
					<legend className={cn('sr-only')}>Ratings view</legend>
					{(['blocks', 'graph'] as const).map((option) => (
						<button
							key={option}
							type="button"
							aria-pressed={view === option}
							disabled={!isHydrated}
							onClick={() => setView(option)}
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
			</div>
			{view === 'blocks' ? (
				<Block ratings={ratings} />
			) : (
				<Graph ratings={ratings} />
			)}
		</div>
	)
}
