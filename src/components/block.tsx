import { cn } from 'cn'

import type { Episode, Ratings } from '@/lib/imdb/types'

function ratingColor(rating: number): string {
	const stops = [
		{ rating: 0, hue: 0 },
		{ rating: 6, hue: 8 },
		{ rating: 7, hue: 42 },
		{ rating: 8, hue: 82 },
		{ rating: 9, hue: 112 },
		{ rating: 10, hue: 132 },
	]
	const clampedRating = Math.max(0, Math.min(10, rating))
	const upperStop =
		stops.find((stop) => stop.rating >= clampedRating) ?? stops.at(-1)!
	const lowerStop = stops[stops.indexOf(upperStop) - 1] ?? upperStop
	const progress =
		(clampedRating - lowerStop.rating) /
		(upperStop.rating - lowerStop.rating || 1)
	const hue = Math.round(
		lowerStop.hue + (upperStop.hue - lowerStop.hue) * progress,
	)
	return `hsl(${hue} 72% 46%)`
}

function episodeLabel(episode: Episode): string {
	return `Season ${episode.seasonNum}, episode ${episode.episodeNum}: ${episode.title}. Rating ${episode.rating.toFixed(1)} out of 10.`
}

export function Block({ ratings }: { ratings: Ratings }) {
	const seasons = Object.entries(ratings.allEpisodeRatings)
		.map(([seasonNum, episodes]) => ({
			seasonNum: Number(seasonNum),
			episodes: Object.values(episodes)
				.filter((episode) => episode.numVotes > 0 && episode.episodeNum > 0)
				.sort((a, b) => a.episodeNum - b.episodeNum),
		}))
		.filter((season) => season.episodes.length > 0)
		.sort((a, b) => a.seasonNum - b.seasonNum)

	return (
		<section
			data-testid="ratings-block"
			className={cn('mx-auto max-w-7xl border border-border bg-card/35')}
		>
			<header
				className={cn(
					'flex items-baseline justify-between gap-4 border-b border-border px-4 py-5 sm:px-6 lg:px-8',
				)}
			>
				<h1
					className={cn(
						'min-w-0 truncate text-2xl font-black tracking-tight sm:text-4xl',
					)}
				>
					{ratings.show.title}
				</h1>
				<span
					className={cn('shrink-0 font-mono text-xs text-muted-foreground')}
				>
					{ratings.show.rating.toFixed(1)} / 10
				</span>
			</header>

			<div className={cn('overflow-x-auto')}>
				<div
					className={cn(
						'flex min-w-full w-max justify-center items-start gap-2 px-4 py-6 sm:gap-3 sm:px-6 lg:px-8',
					)}
					aria-label="Episode ratings by season"
				>
					{seasons.map((season) => (
						<div
							key={season.seasonNum}
							className={cn('flex w-9 flex-col items-center gap-2 sm:w-11')}
						>
							<span
								className={cn(
									'font-mono text-[10px] font-bold tracking-widest text-muted-foreground uppercase',
								)}
							>
								S{season.seasonNum}
							</span>
							<div className={cn('flex flex-col gap-1.5 sm:gap-2')}>
								{season.episodes.map((episode) => (
									<button
										key={`${episode.seasonNum}-${episode.episodeNum}`}
										type="button"
										aria-label={episodeLabel(episode)}
										title={episodeLabel(episode)}
										className={cn(
											'group relative flex size-9 items-center justify-center border border-foreground/15 text-[10px] font-bold text-white transition-transform hover:z-10 hover:scale-110 focus-visible:z-10 focus-visible:scale-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:size-11 sm:text-xs',
										)}
										style={{ backgroundColor: ratingColor(episode.rating) }}
									>
										<span className={cn('text-sm font-black sm:text-base')}>
											{episode.rating.toFixed(1)}
										</span>
										<span
											className={cn(
												'pointer-events-none absolute left-1/2 z-10 hidden w-44 -translate-x-1/2 border border-border bg-background px-2 py-1.5 text-left text-xs font-normal text-foreground shadow-lg group-hover:block group-focus-visible:block',
												episode.episodeNum < 2
													? 'top-full mt-1'
													: 'bottom-full mb-1',
											)}
										>
											{episode.title}
											<span
												className={cn('text-muted-foreground ml-1 font-mono')}
											>
												{episode.rating.toFixed(1)}
											</span>
										</span>
									</button>
								))}
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	)
}
