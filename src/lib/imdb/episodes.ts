import { type Episode, type Ratings } from '@/lib/imdb/types'

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
