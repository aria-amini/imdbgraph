import { createFileRoute, notFound, useHydrated } from '@tanstack/solid-router'
import { cn } from 'cn'
import { createSignal, For, onMount, Show } from 'solid-js'

import { Block } from '@/components/block'
import { Graph } from '@/components/graph'
import { ImageSquare, StarFill } from '@/components/icons'
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
			<header class="border-border mb-8 flex gap-5 border-b pb-6 lg:gap-8">
				<div class="border-border bg-muted aspect-[2/3] w-24 shrink-0 animate-pulse border sm:w-36 lg:w-44" />
				<div class="flex-1 space-y-4 pt-2">
					<div class="bg-muted h-10 w-2/3 animate-pulse sm:h-14" />
					<div class="bg-muted h-4 w-1/3 animate-pulse" />
				</div>
			</header>
			<div class="bg-muted h-96 w-full animate-pulse" />
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
		<div class="border-border bg-muted text-muted-foreground/60 flex aspect-[2/3] w-full items-center justify-center border">
			<ImageSquare aria-hidden class="size-8" />
			<span class="sr-only">Poster unavailable</span>
		</div>
	)
}

function PosterImage(props: { src: string; alt: string; onError: () => void }) {
	const [loaded, setLoaded] = createSignal(false)
	let image: HTMLImageElement | undefined

	// Cached images finish before hydration, so onLoad never fires.
	onMount(() => {
		if (!image?.complete) return

		if (image.naturalWidth > 0) {
			setLoaded(true)
		} else {
			props.onError()
		}
	})

	return (
		<div class="relative">
			<img
				ref={image}
				src={props.src}
				alt={props.alt}
				onLoad={() => setLoaded(true)}
				onError={() => props.onError()}
				class="border-border aspect-[2/3] w-full border object-cover shadow-md"
			/>
			<Show when={!loaded()}>
				<div
					aria-hidden
					class="border-border bg-muted absolute inset-0 animate-pulse border"
				/>
			</Show>
		</div>
	)
}

function ShowPoster(props: { show: Ratings['show'] }) {
	const [failed, setFailed] = createSignal(false)
	const src = () => getPosterImageUrl(props.show.imdbId)

	// The route self-heals: a cache miss fetches and stores the poster, and a
	// known-missing one 404s, so onError is the only signal the UI needs.
	return (
		<div class="w-24 shrink-0 sm:w-36 lg:w-44">
			<Show when={!failed()} fallback={<PosterUnavailable />}>
				<a
					href={src()}
					target="_blank"
					rel="noreferrer"
					class="focus-visible:ring-ring focus-visible:ring-offset-background block outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
				>
					<PosterImage
						src={src()}
						alt={`${props.show.title} poster`}
						onError={() => setFailed(true)}
					/>
				</a>
			</Show>
		</div>
	)
}

/** Page-leading title block: poster, title, year, genres, and the rating. */
function ShowHeader(props: { ratings: Ratings }) {
	const show = () => props.ratings.show
	const votes = () => show().numVotes.toLocaleString('en-US')
	const genres = () => show().genres ?? []

	return (
		<header class="border-border mb-8 flex gap-5 border-b pb-6 lg:gap-8">
			{/* Keyed so each show gets a fresh poster failure state. */}
			<Show when={show().imdbId} keyed>
				<ShowPoster show={show()} />
			</Show>

			<div class="min-w-0 flex-1">
				<h1 class="leading-display text-3xl font-black tracking-tight text-balance sm:text-5xl lg:text-6xl">
					{show().title}
				</h1>
				<p class="text-muted-foreground mt-2 font-mono text-xs tracking-widest uppercase">
					{formatYears(show())}
				</p>
				<Show when={genres().length > 0}>
					<p class="text-muted-foreground mt-1 font-mono text-xs tracking-widest uppercase">
						{genres().join(' · ')}
					</p>
				</Show>
				<a
					href={`https://www.imdb.com/title/${show().imdbId}/`}
					target="_blank"
					rel="noreferrer"
					aria-label={`IMDb rating ${show().rating.toFixed(1)} out of 10 from ${votes()} votes. Opens IMDb in a new tab.`}
					class="text-muted-foreground hover:text-foreground focus-visible:ring-ring focus-visible:ring-offset-background mt-5 inline-flex flex-col items-start gap-1.5 font-mono transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
				>
					<span class="flex items-center gap-x-1.5">
						<span
							class="inline-flex items-center gap-x-1 rounded-sm bg-(--rating-bg) px-1.5 py-0.5 text-(--rating-fg)"
							style={{
								'--rating-bg': ratingColor(show().rating),
								'--rating-fg': ratingTextColor(show().rating),
							}}
						>
							<StarFill aria-hidden class="size-4 shrink-0" />
							<span class="text-base leading-none font-black tabular-nums">
								{show().rating.toFixed(1)}
							</span>
						</span>
						<span class="text-foreground text-base leading-none font-black">
							/ 10
						</span>
					</span>
					<span class="text-2xs tracking-widest uppercase">
						{votes()} votes
					</span>
				</a>
			</div>
		</header>
	)
}

type View = 'blocks' | 'graph'

const VIEWS: readonly View[] = ['blocks', 'graph']

function ViewToggle(props: {
	view: View
	onViewChange: (view: View) => void
	disabled: boolean
}) {
	return (
		<fieldset class="border-border flex border p-0.5">
			<legend class="sr-only">Ratings view</legend>
			<For each={VIEWS}>
				{(option) => (
					<button
						type="button"
						aria-pressed={props.view === option}
						disabled={props.disabled}
						onClick={() => props.onViewChange(option)}
						class={cn(
							'px-3 py-1.5 font-mono text-2xs font-bold tracking-widest uppercase transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-wait disabled:opacity-50',
							props.view === option
								? 'bg-foreground text-background'
								: 'text-muted-foreground hover:bg-muted hover:text-foreground',
						)}
					>
						{option}
					</button>
				)}
			</For>
		</fieldset>
	)
}

function RatingsPage(props: { ratings: Ratings }) {
	const [view, setView] = createSignal<View>('blocks')
	const isHydrated = useHydrated()

	const toolbar = () => (
		<ViewToggle view={view()} onViewChange={setView} disabled={!isHydrated()} />
	)

	return (
		<div>
			<ShowHeader ratings={props.ratings} />
			<Show
				when={view() === 'blocks'}
				fallback={<Graph ratings={props.ratings} toolbar={toolbar()} />}
			>
				<Block ratings={props.ratings} toolbar={toolbar()} />
			</Show>
		</div>
	)
}

function Ratings() {
	const data = Route.useLoaderData()

	return (
		<Page width="wide">
			<Show
				when={hasRatings(data().ratings)}
				fallback={
					<h1 class="py-24 text-center text-3xl font-black tracking-tight text-balance sm:py-32 sm:text-5xl">
						No Ratings Found
					</h1>
				}
			>
				<RatingsPage ratings={data().ratings} />
			</Show>
		</Page>
	)
}
