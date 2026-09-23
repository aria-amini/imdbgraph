import { Tooltip } from '@base-ui/react/tooltip'
import { cn } from 'cn'
import type { ReactNode } from 'react'

import { votedEpisodes } from '@/lib/imdb/episodes'
import {
	ratingColor,
	ratingTextColor,
	type Episode,
	type Ratings,
} from '@/lib/imdb/types'

function episodeLabel(episode: Episode): string {
	return `Season ${episode.seasonNum}, episode ${episode.episodeNum}: ${episode.title}. Rating ${episode.rating.toFixed(1)} out of 10. Opens IMDb in a new tab.`
}

export function Block({
	ratings,
	toolbar,
}: {
	ratings: Ratings
	toolbar?: ReactNode
}) {
	const seasons = Object.keys(ratings.allEpisodeRatings)
		.map((seasonNum) => ({
			seasonNum: Number(seasonNum),
			episodes: votedEpisodes(ratings, Number(seasonNum)),
		}))
		.filter((season) => season.episodes.length > 0)
		.sort((a, b) => a.seasonNum - b.seasonNum)

	return (
		<Tooltip.Provider delay={0}>
			<section
				data-testid="ratings-block"
				className={cn('mx-auto max-w-7xl border border-border bg-card')}
			>
				{toolbar && (
					<div className="border-border flex flex-wrap items-center justify-end gap-x-4 gap-y-2 border-b px-4 py-2 sm:px-6 lg:px-8">
						{toolbar}
					</div>
				)}
				<div
					className="flex flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 lg:px-8"
					aria-label="Episode ratings by season"
				>
					{seasons.map((season, seasonIndex) => (
						<div
							key={season.seasonNum}
							className="grid grid-cols-[2.25rem_1fr] items-start gap-x-1.5 sm:grid-cols-[2.75rem_1fr] sm:gap-2"
						>
							<span className="text-muted-foreground flex h-24 items-end pb-1 font-mono text-[11px] font-bold tracking-widest uppercase sm:h-28">
								S{season.seasonNum}
							</span>
							<div className="flex flex-wrap justify-start gap-x-1.5 gap-y-3 sm:gap-x-2 sm:gap-y-4">
								{season.episodes.map((episode) => (
									<Tooltip.Root
										key={`${episode.seasonNum}-${episode.episodeNum}`}
									>
										<Tooltip.Trigger
											render={
												<a
													href={`https://www.imdb.com/title/${episode.episodeId}/`}
													target="_blank"
													rel="noopener noreferrer"
													aria-label={episodeLabel(episode)}
													className="group focus-visible:ring-ring focus-visible:ring-offset-background relative flex w-9 flex-col text-center font-bold tabular-nums transition-transform hover:z-10 hover:scale-105 focus-visible:z-10 focus-visible:scale-105 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:w-11"
												/>
											}
										>
											<span className="border-border flex h-24 items-end border-b sm:h-28">
												<span
													className="flex w-full items-start justify-center pt-1 text-xs leading-none font-black sm:text-sm"
													style={{
														height: `${Math.max(25, episode.rating * 10)}%`,
														backgroundColor: ratingColor(episode.rating),
														color: ratingTextColor(episode.rating),
													}}
												>
													{episode.rating.toFixed(1)}
												</span>
											</span>
											<span
												aria-hidden
												className="text-muted-foreground group-hover:text-foreground group-focus-visible:text-foreground pt-1 font-mono text-[11px] leading-none"
											>
												E{episode.episodeNum}
											</span>
										</Tooltip.Trigger>
										<Tooltip.Portal>
											<Tooltip.Positioner
												side={seasonIndex === 0 ? 'bottom' : 'top'}
												sideOffset={6}
												collisionPadding={8}
												className="z-50"
											>
												<Tooltip.Popup
													data-testid="episode-tooltip"
													className="border-border bg-background text-foreground w-52 border px-2.5 py-2 text-left text-xs font-normal shadow-lg"
												>
													{episode.title}
													<span className="text-muted-foreground ml-1 font-mono">
														{episode.rating.toFixed(1)}
													</span>
												</Tooltip.Popup>
											</Tooltip.Positioner>
										</Tooltip.Portal>
									</Tooltip.Root>
								))}
							</div>
						</div>
					))}
				</div>
			</section>
		</Tooltip.Provider>
	)
}
