'use client'

import { cn } from 'cn'
import { Star } from 'lucide-react'

import type { ShowImage } from '@/lib/images/thumbnail'
import { ratingColor } from '@/lib/imdb/rating-color'
import { formatYears, type Ratings } from '@/lib/imdb/types'

/**
 * Page-leading title block: poster, title, and the IMDb rating line.
 */
export function ShowHeader({
	ratings,
	image,
}: {
	ratings: Ratings
	image: ShowImage | null
}) {
	const { show } = ratings

	return (
		<header
			className={cn('border-border mb-8 flex gap-5 border-b pb-6 lg:gap-8')}
		>
			{image && (
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
			)}

			<div className="min-w-0 flex-1">
				<h1 className="text-3xl leading-[1.05] font-black tracking-tight text-balance sm:text-5xl lg:text-6xl">
					{show.title}
				</h1>
				<p className="text-muted-foreground mt-2 font-mono text-[10px] tracking-widest uppercase">
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
					aria-label={`IMDb rating ${show.rating.toFixed(1)} out of 10 from ${show.numVotes.toLocaleString('en-US')} votes. Opens IMDb in a new tab.`}
					className="text-muted-foreground hover:text-foreground focus-visible:ring-ring focus-visible:ring-offset-background mt-5 inline-flex flex-wrap items-baseline gap-x-2 gap-y-1 font-mono transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
				>
					<Star
						className="size-4 shrink-0 self-center"
						aria-hidden
						style={{ color: ratingColor(show.rating), fill: 'currentColor' }}
					/>
					<span className="text-foreground text-2xl leading-none font-black tabular-nums sm:text-3xl">
						{show.rating.toFixed(1)}
					</span>
					<span className="text-[10px] font-bold tracking-widest uppercase">
						/ 10
					</span>
					<span className="text-[10px] tracking-widest uppercase">
						{show.numVotes.toLocaleString('en-US')} votes
					</span>
				</a>
			</div>
		</header>
	)
}
