import { ImageSquare, Star } from '@phosphor-icons/react/dist/ssr'
import { createFileRoute, notFound, useHydrated } from '@tanstack/react-router'
import { cn } from 'cn'
import { useState } from 'react'

import { Block } from '@/components/block'
import { Graph } from '@/components/graph'
import { Page } from '@/components/page'
import { votedEpisodes } from '@/lib/imdb/episodes'
import { ratingsQuery } from '@/lib/imdb/ratings'
import { scrapeVersion } from '@/lib/imdb/scraper/scrape-run'
import {
	formatYears,
	imdbIdSchema,
	ratingColor,
	ratingTextColor,
	type Ratings,
} from '@/lib/imdb/types'
import { getPosterImageUrl } from '@/lib/thumbnail/client'

function hasRatings(ratings: Ratings): boolean {
	return Object.keys(ratings.allEpisodeRatings).some(
		(seasonNum) => votedEpisodes(ratings, Number(seasonNum)).length > 0,
	)
}

function RatingsSkeleton() {
	return (
		<Page width="wide" busy>
			<header className="border-border mb-8 flex gap-5 border-b pb-6 lg:gap-8">
				<div className="border-border bg-muted aspect-[2/3] w-24 shrink-0 animate-pulse border sm:w-36 lg:w-44" />
				<div className="flex-1 space-y-4 pt-2">
					<div className="bg-muted h-10 w-2/3 animate-pulse sm:h-14" />
					<div className="bg-muted h-4 w-1/3 animate-pulse" />
				</div>
			</header>
			<div className="bg-muted h-96 w-full animate-pulse" />
		</Page>
	)
}

export const Route = createFileRoute('/ratings/$id')({
	component: Ratings,
	pendingComponent: RatingsSkeleton,
	loader: async ({ params, context: { queryClient } }) => {
		const showId = imdbIdSchema.safeParse(params.id)

		if (!showId.success) {
			throw notFound()
		}

		const ratings = await queryClient.ensureQueryData(
			ratingsQuery(scrapeVersion(queryClient), showId.data),
		)

		if (!ratings) {
			throw notFound()
		}

		return { ratings }
	},
})

function PosterUnavailable() {
	return (
		<div className="border-border bg-muted text-muted-foreground/60 flex aspect-[2/3] w-full items-center justify-center border">
			<ImageSquare aria-hidden className="size-8" />
			<span className="sr-only">Poster unavailable</span>
		</div>
	)
}

function PosterImage({
	src,
	alt,
	onError,
}: {
	src: string
	alt: string
	onError: () => void
}) {
	const [loaded, setLoaded] = useState(false)

	return (
		<div className="relative">
			<img
				ref={(node) => {
					// Cached images finish before hydration, so onLoad never fires.
					if (!node?.complete) return

					if (node.naturalWidth > 0) {
						setLoaded(true)
					} else {
						onError()
					}
				}}
				src={src}
				alt={alt}
				onLoad={() => setLoaded(true)}
				onError={onError}
				className="border-border aspect-[2/3] w-full border object-cover shadow-md"
			/>
			{!loaded && (
				<div
					aria-hidden
					className="border-border bg-muted absolute inset-0 animate-pulse border"
				/>
			)}
		</div>
	)
}

function ShowPoster({ show }: { show: Ratings['show'] }) {
	const [failed, setFailed] = useState(false)
	const src = getPosterImageUrl(show.imdbId)

	// The route self-heals: a cache miss fetches and stores the poster, and a
	// known-missing one 404s, so onError is the only signal the UI needs.
	return (
		<div className="w-24 shrink-0 sm:w-36 lg:w-44">
			{failed ? (
				<PosterUnavailable />
			) : (
				<a
					href={src}
					target="_blank"
					rel="noreferrer"
					className="focus-visible:ring-ring focus-visible:ring-offset-background block outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
				>
					<PosterImage
						src={src}
						alt={`${show.title} poster`}
						onError={() => setFailed(true)}
					/>
				</a>
			)}
		</div>
	)
}

/** Page-leading title block: poster, title, year, genres, and the rating. */
function ShowHeader({ ratings }: { ratings: Ratings }) {
	const { show } = ratings
	const votes = show.numVotes.toLocaleString('en-US')
	const hasGenres = Boolean(show.genres && show.genres.length > 0)

	return (
		<header className="border-border mb-8 flex gap-5 border-b pb-6 lg:gap-8">
			<ShowPoster key={show.imdbId} show={show} />

			<div className="min-w-0 flex-1">
				<h1 className="leading-display text-3xl font-black tracking-tight text-balance sm:text-5xl lg:text-6xl">
					{show.title}
				</h1>
				<p className="text-muted-foreground mt-2 font-mono text-xs tracking-widest uppercase">
					{formatYears(show)}
				</p>
				{hasGenres && (
					<p className="text-muted-foreground mt-1 font-mono text-xs tracking-widest uppercase">
						{show.genres?.join(' · ')}
					</p>
				)}
				<a
					href={`https://www.imdb.com/title/${show.imdbId}/`}
					target="_blank"
					rel="noreferrer"
					aria-label={`IMDb rating ${show.rating.toFixed(1)} out of 10 from ${votes} votes. Opens IMDb in a new tab.`}
					className="text-muted-foreground hover:text-foreground focus-visible:ring-ring focus-visible:ring-offset-background mt-5 inline-flex flex-col items-start gap-1.5 font-mono transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
				>
					<span className="flex items-center gap-x-1.5">
						<span
							className="inline-flex items-center gap-x-1 rounded-sm bg-(--rating-bg) px-1.5 py-0.5 text-(--rating-fg)"
							style={{
								'--rating-bg': ratingColor(show.rating),
								'--rating-fg': ratingTextColor(show.rating),
							}}
						>
							<Star aria-hidden className="size-4 shrink-0" weight="fill" />
							<span className="text-base leading-none font-black tabular-nums">
								{show.rating.toFixed(1)}
							</span>
						</span>
						<span className="text-foreground text-base leading-none font-black">
							/ 10
						</span>
					</span>
					<span className="text-2xs tracking-widest uppercase">
						{votes} votes
					</span>
				</a>
			</div>
		</header>
	)
}

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
						'px-3 py-1.5 font-mono text-2xs font-bold tracking-widest uppercase transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-wait disabled:opacity-50',
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

function RatingsPage({ ratings }: { ratings: Ratings }) {
	const [view, setView] = useState<View>('blocks')
	const isHydrated = useHydrated()

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

function Ratings() {
	const { ratings } = Route.useLoaderData()

	return (
		<Page width="wide">
			{!hasRatings(ratings) ? (
				<h1 className="py-24 text-center text-3xl font-black tracking-tight text-balance sm:py-32 sm:text-5xl">
					No Ratings Found
				</h1>
			) : (
				<RatingsPage ratings={ratings} />
			)}
		</Page>
	)
}
