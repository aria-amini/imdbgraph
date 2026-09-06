'use client'

import { cn } from 'cn'
import { ExternalLink, Star } from 'lucide-react'

import type { ShowImage } from '@/lib/images/thumbnail'
import { ratingColor } from '@/lib/imdb/rating-color'
import { formatYears, type Ratings } from '@/lib/imdb/types'

function capitalize(word: string): string {
	return word.charAt(0).toUpperCase() + word.slice(1)
}

function scheduleLine(image: ShowImage | null): string | null {
	if (!image || (image.airsDays.length === 0 && !image.network)) {
		return null
	}
	const parts = []
	if (image.airsDays.length > 0) {
		parts.push(image.airsDays.map(capitalize).join(', '))
	}
	if (image.airsTime) {
		parts.push(image.airsTime)
	}
	if (image.network) {
		parts.push(`on ${image.network}`)
	}
	return parts.join(' ')
}

function Stat({
	value,
	label,
	className,
}: {
	value: string
	label?: string
	className?: string
}) {
	return (
		<div className={cn('flex items-baseline gap-1.5', className)}>
			<span className="text-sm font-bold tabular-nums">{value}</span>
			{label && (
				<span className="text-muted-foreground text-[10px] tracking-widest uppercase">
					{label}
				</span>
			)}
		</div>
	)
}

/**
 * Page-leading title block: poster, title, genres, and the show's vital
 * statistics in a ledger-style strip.
 */
export function ShowHeader({
	ratings,
	image,
}: {
	ratings: Ratings
	image: ShowImage | null
}) {
	const { show } = ratings
	const schedule = scheduleLine(image)

	return (
		<header className="border-border mb-8 flex gap-5 border-b pb-6 lg:gap-8">
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
					<a
						href="https://www.tvmaze.com"
						target="_blank"
						rel="noreferrer"
						className="text-muted-foreground hover:text-foreground mt-2 block font-mono text-[10px] tracking-widest uppercase transition-colors"
					>
						data: TVmaze
					</a>
				</div>
			)}

			<div className="min-w-0 flex-1">
				<h1 className="text-3xl leading-[1.05] font-black tracking-tight text-balance sm:text-5xl lg:text-6xl">
					{show.title}
				</h1>
				<p className="text-muted-foreground mt-2 font-mono text-[11px] tracking-widest uppercase">
					{formatYears(show)}
					{show.genres && show.genres.length > 0 && (
						<span aria-hidden> · </span>
					)}
					{show.genres?.join(' · ')}
				</p>

				<dl
					className={cn('mt-6 flex flex-wrap items-baseline gap-x-8 gap-y-3')}
				>
					<div className="flex items-baseline gap-1.5">
						<Star
							className="size-4 shrink-0"
							aria-hidden
							style={{ color: ratingColor(show.rating), fill: 'currentColor' }}
						/>
						<dt className="sr-only">IMDb rating</dt>
						<dd className="flex items-baseline gap-1.5">
							<span className="text-2xl leading-none font-black tabular-nums sm:text-3xl">
								{show.rating.toFixed(1)}
							</span>
							<span className="text-muted-foreground text-xs font-bold tracking-widest uppercase">
								/ 10
							</span>
						</dd>
					</div>
					<Stat value={show.numVotes.toLocaleString('en-US')} label="votes" />
					{show.runtimeMinutes != null && (
						<Stat value={`~${show.runtimeMinutes}m`} label="per ep" />
					)}
					{image?.status && <Stat value={image.status} />}
				</dl>

				<div className="mt-4 flex flex-wrap items-center gap-3">
					{schedule && (
						<p className="text-muted-foreground font-mono text-[11px] tracking-widest uppercase">
							{schedule}
						</p>
					)}
					<a
						href={`https://www.imdb.com/title/${show.imdbId}/`}
						target="_blank"
						rel="noreferrer"
						className={cn(
							'border-border text-muted-foreground hover:bg-foreground hover:text-background',
							'ml-auto inline-flex items-center gap-1.5 border px-3 py-1.5 font-mono text-[10px] font-bold tracking-widest uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
						)}
					>
						View on IMDb
						<ExternalLink className="size-3.5" aria-hidden />
					</a>
				</div>
			</div>
		</header>
	)
}
