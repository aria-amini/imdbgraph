import { z } from 'zod'

import { imdbIdSchema, type Episode, type Ratings } from '@/lib/imdb/types'

const ratingSchema = z.number().min(1).max(10)

// Validates episode-shaped data recovered from chart internals, which is
// untyped.
export const episodeSchema: z.ZodType<Episode> = z.object({
	episodeId: imdbIdSchema,
	title: z.string(),
	seasonNum: z.number(),
	episodeNum: z.number(),
	rating: ratingSchema,
	numVotes: z.number(),
})

/** Episodes with recorded votes, ordered by episode number. */
export function votedEpisodes(ratings: Ratings, seasonNum: number): Episode[] {
	return Object.values(ratings.allEpisodeRatings[seasonNum] ?? {})
		.filter(
			(episode) =>
				episode.numVotes > 0 &&
				episode.episodeNum > 0 &&
				episode.rating >= 1 &&
				episode.rating <= 10,
		)
		.sort((a, b) => a.episodeNum - b.episodeNum)
}
