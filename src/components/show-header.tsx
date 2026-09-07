'use client'

import { Star } from '@phosphor-icons/react/dist/ssr'
import { useSuspenseQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import { Suspense } from 'react'

import { showImageQuery } from '@/lib/images/image-query'
import { ratingColor } from '@/lib/imdb/rating-color'
import { formatYears, type Ratings } from '@/lib/imdb/types'

function PosterSkeleton() {
	return (
		<div aria-hidden className="w-24 shrink-0 sm:w-36 lg:w-44">
			<div className="border-border bg-muted aspect-[2/3] w-full animate-pulse border" />
		</div>
	)
}

function ShowPoster({ show }: { show: Ratings['show'] }) {
	const { data: image } = useSuspenseQuery(showImageQuery(show.imdbId))
	if (!image) return null

	return (
		<div className="w-24 shrink-0 sm:w-36 lg:w-44">
			<a
				href={image.url}
				target="_blank"
				rel="noreferrer"
				className="focus-visible:ring-ring focus-visible:ring-offset-background block outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
			>
				<img
					src={image.url}
					alt={`${show.title} poster`}
					className="border-border aspect-[2/3] w-full border object-cover shadow-md"
				/>
			</a>
		</div>
	)
}

/**
 * Page-leading title block: poster, title, meta line, and a quiet inline
 * IMDb rating line that links to the show's IMDb page.
 */
export function ShowHeader({ ratings }: { ratings: Ratings }) {
	const { show } = ratings
	const votes = show.numVotes.toLocaleString('en-US')

	return (
		<header
			className={cn('border-border mb-8 flex gap-5 border-b pb-6 lg:gap-8')}
		>
			<Suspense fallback={<PosterSkeleton />}>
				<ShowPoster show={show} />
			</Suspense>

			<div className="min-w-0 flex-1">
				<h1 className="text-3xl leading-[1.05] font-black tracking-tight text-balance sm:text-5xl lg:text-6xl">
					{show.title}
				</h1>
				<p className="text-muted-foreground mt-2 font-mono text-xs tracking-widest uppercase">
					{formatYears(show)}
					{show.genres && show.genres.length > 0 && (
						<span aria-hidden> · </span>
					)}
					{show.genres?.join(' · ')}
				</p>
				<a
					href={`https://www.imdb.com/title/${show.imdbId}/`}
					target="_blank"
					rel="noreferrer"
					aria-label={`IMDb rating ${show.rating.toFixed(1)} out of 10 from ${votes} votes. Opens IMDb in a new tab.`}
					className={cn(
						'text-muted-foreground hover:text-foreground mt-5 inline-flex flex-col items-start gap-1.5 font-mono transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
					)}
				>
					<span className="flex items-baseline gap-x-1.5">
						<Star
							aria-hidden
							className="size-4 shrink-0 self-center"
							style={{ color: ratingColor(show.rating) }}
							weight="fill"
						/>
						<span className="text-foreground text-base leading-none font-black tabular-nums">
							{show.rating.toFixed(1)}
						</span>
						<span className="text-foreground text-base leading-none font-black">
							/ 10
						</span>
					</span>
					<span className="text-[11px] tracking-widest uppercase">
						{votes} votes
					</span>
				</a>
			</div>
		</header>
	)
}
