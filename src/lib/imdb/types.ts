import type { InferSelectModel } from 'drizzle-orm'

import type { episode, show } from '@/db/tables'

export type Show = InferSelectModel<typeof show>
export type Episode = Pick<
	InferSelectModel<typeof episode>,
	'episodeId' | 'title' | 'seasonNum' | 'episodeNum' | 'rating' | 'numVotes'
>

export type RatingsData = Record<number, Record<number, Episode>>

export interface Ratings {
	show: Show
	allEpisodeRatings: RatingsData
}

/** Formats a show's start and end years for display. */
export function formatYears(show: {
	startYear: string
	endYear: string | null
}): string {
	const endDate = show.endYear ?? 'Present'
	return `${show.startYear} - ${endDate}`
}
