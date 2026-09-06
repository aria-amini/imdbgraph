import { cn } from 'cn'

import { ratingColor } from '@/lib/imdb/rating-color'
import type { Episode, Ratings } from '@/lib/imdb/types'

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
			<div
				className={cn('flex flex-col gap-4 px-4 py-6 sm:gap-5 sm:px-6 lg:px-8')}
				aria-label="Episode ratings by season"
			>
				{seasons.map((season, seasonIndex) => (
					<div
						key={season.seasonNum}
						className={cn(
							'grid grid-cols-[2.25rem_1fr] items-start gap-x-2 sm:grid-cols-[2.75rem_1fr] sm:gap-x-3',
						)}
					>
						<span
							className={cn(
								'flex h-9 items-center font-mono text-[10px] font-bold tracking-widest text-muted-foreground uppercase sm:h-11',
							)}
						>
							S{season.seasonNum}
						</span>
						<div
							className={cn('flex flex-wrap justify-start gap-1.5 sm:gap-2')}
						>
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
									<span
										className={cn(
											'absolute left-0.5 top-0.5 font-mono text-[8px] font-bold leading-none text-white/70 sm:left-1 sm:top-1 sm:text-[9px]',
										)}
									>
										E{episode.episodeNum}
									</span>
									<span className={cn('text-sm font-black sm:text-base')}>
										{episode.rating.toFixed(1)}
									</span>
									<span
										className={cn(
											'pointer-events-none absolute left-1/2 z-10 hidden w-44 -translate-x-1/2 border border-border bg-background px-2 py-1.5 text-left text-xs font-normal text-foreground shadow-lg group-hover:block group-focus-visible:block',
											seasonIndex === 0 ? 'top-full mt-1' : 'bottom-full mb-1',
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
		</section>
	)
}
