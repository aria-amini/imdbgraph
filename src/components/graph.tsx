import { cn } from 'cn'
import {
	children,
	createMemo,
	createSignal,
	For,
	onCleanup,
	onMount,
	Show,
	type JSX,
} from 'solid-js'

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { votedEpisodes } from '@/lib/imdb/episodes'
import { type Episode, type Ratings } from '@/lib/imdb/types'

interface ChartPoint {
	episodeIndex: number
	episode: Episode
}

interface SeasonSeries {
	seasonNum: number
	points: ChartPoint[]
}

const SEASON_COLORS = [
	'var(--chart-1)',
	'var(--chart-2)',
	'var(--chart-3)',
	'var(--chart-4)',
	'var(--chart-5)',
]

const MARGIN = { top: 0, right: 12, bottom: 0, left: 12 }

const Y_AXIS_WIDTH = 20

const X_AXIS_HEIGHT = 30

const TICK_LENGTH = 6

const MAX_Y = 10

const MAX_Y_INTERVALS = 5

// Server render and first paint use this until the container is measured.
const INITIAL_SIZE = { width: 320, height: 200 }

const TOOLTIP_OFFSET = 12

/** Groups voted episodes by season and numbers them across the whole show. */
export function transformRatingsData(ratings: Ratings): SeasonSeries[] {
	let episodeIndex = 1

	return Object.keys(ratings.allEpisodeRatings).map((seasonKey) => {
		const seasonNum = Number.parseInt(seasonKey, 10)

		return {
			seasonNum,
			points: votedEpisodes(ratings, seasonNum).map((episode) => ({
				episodeIndex: episodeIndex++,
				episode,
			})),
		}
	})
}

/** Integer ticks counted down from the top of the scale. */
function yTicks(min: number): number[] {
	const range = MAX_Y - min
	const step = [1, 2, 5].find((step) => range / step <= MAX_Y_INTERVALS) ?? 5
	const ticks: number[] = []

	for (let tick = MAX_Y; tick >= min; tick -= step) ticks.push(tick)

	return ticks
}

/** Renders episode ratings as a season-by-season line chart. */
export function Graph(props: { ratings: Ratings; toolbar?: JSX.Element }) {
	const series = createMemo(() => transformRatingsData(props.ratings))
	const points = createMemo(() => series().flatMap((season) => season.points))
	// Resolve once: reading a JSX prop twice would build the toolbar twice.
	const toolbar = children(() => props.toolbar)

	return (
		<Card data-testid="ratings-graph" variant="chart">
			<Show when={toolbar()}>
				<div class="border-border flex flex-wrap items-center justify-end gap-x-4 gap-y-2 border-b px-4 py-2 sm:px-6 lg:px-8">
					{toolbar()}
				</div>
			</Show>
			<CardContent>
				<LineChart series={series()} points={points()} />
			</CardContent>
		</Card>
	)
}

function LineChart(props: { series: SeasonSeries[]; points: ChartPoint[] }) {
	const [size, setSize] = createSignal(INITIAL_SIZE)
	const [activeIndex, setActiveIndex] = createSignal<number>()
	let container: HTMLDivElement | undefined

	onMount(() => {
		if (!container) return

		const measure = (element: HTMLElement) =>
			setSize({ width: element.clientWidth, height: element.clientHeight })

		measure(container)

		const observer = new ResizeObserver(() => {
			if (container) measure(container)
		})

		observer.observe(container)
		onCleanup(() => observer.disconnect())
	})

	const plot = createMemo(() => ({
		left: MARGIN.left + Y_AXIS_WIDTH,
		right: size().width - MARGIN.right,
		top: MARGIN.top,
		bottom: size().height - MARGIN.bottom - X_AXIS_HEIGHT,
	}))

	const lastIndex = () => props.points.length

	const minRating = () =>
		Math.min(MAX_Y - 1, Math.floor(Math.min(...props.points.map(rating))))

	// The first and last episodes sit on the plot edges.
	const x = (episodeIndex: number) =>
		plot().left +
		((episodeIndex - 1) / Math.max(lastIndex() - 1, 1)) *
			(plot().right - plot().left)

	const y = (value: number) =>
		plot().bottom -
		((value - minRating()) / (MAX_Y - minRating())) *
			(plot().bottom - plot().top)

	const activePoint = () =>
		props.points.find((point) => point.episodeIndex === activeIndex())

	const track = (event: PointerEvent) => {
		const svg = event.currentTarget

		if (!(svg instanceof SVGSVGElement)) return
		const bounds = svg.getBoundingClientRect()
		const pointerX = event.clientX - bounds.left
		const pointerY = event.clientY - bounds.top
		const area = plot()

		if (
			pointerX < area.left ||
			pointerX > area.right ||
			pointerY < area.top ||
			pointerY > area.bottom
		) {
			setActiveIndex(undefined)

			return
		}

		const index =
			Math.round(
				((pointerX - area.left) / (area.right - area.left)) *
					Math.max(lastIndex() - 1, 0),
			) + 1

		setActiveIndex(Math.min(Math.max(index, 1), lastIndex()))
	}

	const stepActive = (step: 1 | -1) =>
		setActiveIndex((current) =>
			Math.min(
				Math.max((current ?? (step === 1 ? 0 : lastIndex() + 1)) + step, 1),
				lastIndex(),
			),
		)

	const handleKeyDown = (event: KeyboardEvent) => {
		if (event.key === 'ArrowRight') stepActive(1)
		else if (event.key === 'ArrowLeft') stepActive(-1)
		else if (event.key === 'Escape') setActiveIndex(undefined)
		else return
		event.preventDefault()
	}

	return (
		<div
			ref={container}
			data-slot="chart"
			class="relative flex aspect-auto h-[clamp(260px,min(56vw,calc(100dvh-13.5rem)),620px)] justify-center text-xs"
		>
			{/* The chart is explorable with arrow keys, as the Recharts accessibility layer was. */}
			{/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
			<svg
				data-slot="chart-surface"
				width={size().width}
				height={size().height}
				role="application"
				aria-label="Episode ratings line chart. Use the left and right arrow keys to read episodes."
				// oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
				tabindex={0}
				class="outline-hidden"
				onPointerMove={track}
				onPointerLeave={() => setActiveIndex(undefined)}
				onKeyDown={handleKeyDown}
				onBlur={() => setActiveIndex(undefined)}
			>
				<For each={yTicks(minRating())}>
					{(tick) => (
						<line
							class="stroke-border/50"
							x1={plot().left}
							x2={plot().right}
							y1={y(tick)}
							y2={y(tick)}
						/>
					)}
				</For>
				<line
					class="stroke-muted-foreground"
					x1={plot().left}
					x2={plot().left}
					y1={plot().top}
					y2={plot().bottom}
				/>
				<line
					class="stroke-muted-foreground"
					x1={plot().left}
					x2={plot().right}
					y1={plot().bottom}
					y2={plot().bottom}
				/>
				<For each={yTicks(minRating())}>
					{(tick) => (
						<>
							<line
								class="stroke-muted-foreground"
								x1={plot().left - TICK_LENGTH}
								x2={plot().left}
								y1={y(tick)}
								y2={y(tick)}
							/>
							<text
								class="fill-muted-foreground"
								x={plot().left - TICK_LENGTH - 2}
								y={y(tick)}
								text-anchor="end"
								// The top label hangs below its tick; centered it would clip.
								dominant-baseline={tick === MAX_Y ? 'hanging' : 'central'}
							>
								{tick}
							</text>
						</>
					)}
				</For>
				<Show when={activePoint()}>
					{(point) => (
						<line
							data-slot="chart-cursor"
							class="stroke-border"
							x1={x(point().episodeIndex)}
							x2={x(point().episodeIndex)}
							y1={plot().top}
							y2={plot().bottom}
						/>
					)}
				</Show>
				<For each={props.series}>
					{(season, seasonIndex) => (
						<g
							data-season={season.seasonNum}
							stroke={SEASON_COLORS[seasonIndex() % SEASON_COLORS.length]}
						>
							<polyline
								fill="none"
								stroke-width={2}
								points={season.points
									.map(
										(point) =>
											`${x(point.episodeIndex)},${y(point.episode.rating)}`,
									)
									.join(' ')}
							/>
							<For each={season.points}>
								{(point) => (
									<circle
										cx={x(point.episodeIndex)}
										cy={y(point.episode.rating)}
										r={3}
										class="fill-primary-foreground"
										stroke-width={1}
									/>
								)}
							</For>
						</g>
					)}
				</For>
			</svg>
			<Show when={activePoint()}>
				{(point) => (
					<ChartTooltip
						episode={point().episode}
						left={x(point().episodeIndex)}
						top={y(point().episode.rating)}
						width={size().width}
						height={size().height}
					/>
				)}
			</Show>
		</div>
	)
}

function rating(point: ChartPoint) {
	return point.episode.rating
}

function ChartTooltip(props: {
	episode: Episode
	left: number
	top: number
	width: number
	height: number
}) {
	const flipped = () => props.left > props.width / 2

	return (
		<div
			data-slot="chart-tooltip"
			class={cn(
				'pointer-events-none absolute top-(--tooltip-top) left-(--tooltip-left) z-10 -translate-y-1/2',
				flipped() && '-translate-x-full',
			)}
			style={{
				'--tooltip-left': `${flipped() ? props.left - TOOLTIP_OFFSET : props.left + TOOLTIP_OFFSET}px`,
				'--tooltip-top': `${Math.min(Math.max(props.top, 48), props.height - 48)}px`,
			}}
		>
			<Card variant="tooltip">
				<CardHeader>
					<CardTitle>
						S{props.episode.seasonNum}E{props.episode.episodeNum}:
					</CardTitle>
					<CardDescription>{props.episode.title}</CardDescription>
				</CardHeader>
				<CardContent>
					<CardDescription variant="numeric">
						{props.episode.rating.toFixed(1)} / 10.0 (
						{props.episode.numVotes.toLocaleString()} votes)
					</CardDescription>
				</CardContent>
			</Card>
		</div>
	)
}
