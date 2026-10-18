import {
	autoUpdate,
	computePosition,
	flip,
	offset,
	shift,
	type Placement,
} from '@floating-ui/dom'
import { cn } from 'cn'
import {
	children,
	createEffect,
	createSignal,
	createUniqueId,
	For,
	onCleanup,
	Show,
	type JSX,
} from 'solid-js'
import { Portal } from 'solid-js/web'

import { votedEpisodes } from '@/lib/imdb/episodes'
import {
	ratingColor,
	ratingTextColor,
	type Episode,
	type Ratings,
} from '@/lib/imdb/types'

const TOOLTIP_OFFSET = 6

const VIEWPORT_PADDING = 8

interface ActiveTooltip {
	episode: Episode
	anchor: HTMLElement
	placement: Placement
}

function episodeLabel(episode: Episode): string {
	return `Season ${episode.seasonNum}, episode ${episode.episodeNum}: ${episode.title}. Rating ${episode.rating.toFixed(1)} out of 10. Opens IMDb in a new tab.`
}

function seasonsOf(ratings: Ratings) {
	return Object.keys(ratings.allEpisodeRatings)
		.map((seasonNum) => ({
			seasonNum: Number(seasonNum),
			episodes: votedEpisodes(ratings, Number(seasonNum)),
		}))
		.filter((season) => season.episodes.length > 0)
		.sort((a, b) => a.seasonNum - b.seasonNum)
}

export function Block(props: { ratings: Ratings; toolbar?: JSX.Element }) {
	const seasons = () => seasonsOf(props.ratings)
	// Resolve once: reading a JSX prop twice would build the toolbar twice.
	const toolbar = children(() => props.toolbar)
	const [active, setActive] = createSignal<ActiveTooltip>()
	const tooltipId = createUniqueId()

	return (
		<section
			data-testid="ratings-block"
			class={cn('mx-auto max-w-7xl border border-border bg-card')}
		>
			<Show when={toolbar()}>
				<div
					class={cn(
						'flex flex-wrap items-center justify-end gap-x-4 gap-y-2 border-border border-b px-4 py-2 sm:px-6 lg:px-8',
					)}
				>
					{toolbar()}
				</div>
			</Show>
			<div
				class={cn('flex flex-col gap-4 px-4 py-6 sm:gap-6 sm:px-6 lg:px-8')}
				aria-label="Episode ratings by season"
			>
				<For each={seasons()}>
					{(season, seasonIndex) => (
						<div
							class={cn(
								'grid grid-cols-[2.25rem_1fr] items-start gap-x-1.5 sm:grid-cols-[2.75rem_1fr] sm:gap-2',
							)}
						>
							<span
								class={cn(
									'flex h-9 items-center font-mono text-2xs font-bold tracking-widest text-muted-foreground uppercase sm:h-11',
								)}
							>
								S{season.seasonNum}
							</span>
							<div class={cn('flex flex-wrap justify-start gap-1.5 sm:gap-2')}>
								<For each={season.episodes}>
									{(episode) => (
										<EpisodeTile
											episode={episode}
											placement={seasonIndex() === 0 ? 'bottom' : 'top'}
											describedBy={
												active()?.episode === episode ? tooltipId : undefined
											}
											onActivate={setActive}
											onDeactivate={() => setActive(undefined)}
										/>
									)}
								</For>
							</div>
						</div>
					)}
				</For>
			</div>
			<Show when={active()}>
				{(tooltip) => <EpisodeTooltip id={tooltipId} tooltip={tooltip()} />}
			</Show>
		</section>
	)
}

function EpisodeTile(props: {
	episode: Episode
	placement: Placement
	describedBy: string | undefined
	onActivate: (tooltip: ActiveTooltip) => void
	onDeactivate: () => void
}) {
	const activate = (anchor: HTMLElement) =>
		props.onActivate({
			episode: props.episode,
			anchor,
			placement: props.placement,
		})

	return (
		<a
			href={`https://www.imdb.com/title/${props.episode.episodeId}/`}
			target="_blank"
			rel="noopener noreferrer"
			aria-label={episodeLabel(props.episode)}
			aria-describedby={props.describedBy}
			// Touch taps open the link; only a mouse hover previews the episode.
			onPointerEnter={(event) => {
				if (event.pointerType === 'mouse') activate(event.currentTarget)
			}}
			onPointerLeave={props.onDeactivate}
			onFocus={(event) => {
				if (event.currentTarget.matches(':focus-visible')) {
					activate(event.currentTarget)
				}
			}}
			onBlur={props.onDeactivate}
			onKeyDown={(event) => {
				if (event.key === 'Escape') props.onDeactivate()
			}}
			class={cn(
				'group relative flex size-9 items-center justify-center border border-background/40 bg-(--rating-bg) text-(--rating-fg) text-3xs font-bold transition-transform after:absolute after:-inset-1 hover:z-10 hover:scale-110 focus-visible:z-10 focus-visible:scale-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:size-11 sm:text-xs',
			)}
			style={{
				'--rating-bg': ratingColor(props.episode.rating),
				'--rating-fg': ratingTextColor(props.episode.rating),
			}}
		>
			<span
				class={cn(
					'absolute top-0.5 left-0.5 font-mono text-5xs leading-none font-bold opacity-70 sm:top-1 sm:left-1 sm:text-4xs',
				)}
			>
				E{props.episode.episodeNum}
			</span>
			<span class={cn('text-sm font-black sm:text-base')}>
				{props.episode.rating.toFixed(1)}
			</span>
		</a>
	)
}

/** One tooltip shared by every tile, so long shows do not mount one per episode. */
function EpisodeTooltip(props: { id: string; tooltip: ActiveTooltip }) {
	let popup: HTMLDivElement | undefined

	createEffect(() => {
		const { anchor, placement } = props.tooltip

		if (!popup) return
		const floating = popup

		const place = () =>
			void computePosition(anchor, floating, {
				placement,
				strategy: 'fixed',
				middleware: [
					offset(TOOLTIP_OFFSET),
					flip({ padding: VIEWPORT_PADDING }),
					shift({ padding: VIEWPORT_PADDING }),
				],
			}).then(({ x, y }) => {
				floating.style.left = `${x}px`
				floating.style.top = `${y}px`
				// Hidden by class until the first placement, so it never flashes
				// at the viewport origin.
				floating.style.visibility = 'visible'
			})

		onCleanup(autoUpdate(anchor, floating, place))
	})

	return (
		<Portal>
			<div
				ref={popup}
				id={props.id}
				role="tooltip"
				data-testid="episode-tooltip"
				class={cn(
					'invisible fixed top-0 left-0 z-50 w-52 border border-border bg-background px-2.5 py-2 text-left text-xs font-normal text-foreground shadow-lg',
				)}
			>
				{props.tooltip.episode.title}
				<span class={cn('ml-1 font-mono text-muted-foreground')}>
					{props.tooltip.episode.rating.toFixed(1)}
				</span>
			</div>
		</Portal>
	)
}
