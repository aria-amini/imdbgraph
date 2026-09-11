import type { Episode, Ratings } from '@/lib/imdb/types'

export type ChartDataPoint = {
	episodeIndex: number
} & Record<`season${number}` | `episode${number}`, number | Episode | null>

/** Episodes with recorded votes, ordered by episode number. */
export function votedEpisodes(ratings: Ratings, seasonNum: number): Episode[] {
	return Object.values(ratings.allEpisodeRatings[seasonNum] ?? {})
		.filter((episode) => episode.numVotes > 0 && episode.episodeNum > 0)
		.sort((a, b) => a.episodeNum - b.episodeNum)
}

/** Converts grouped episode ratings into chart points and season labels. */
export function transformRatingsData(ratings: Ratings): {
	data: ChartDataPoint[]
	seasons: number[]
} {
	let episodeIndex = 1
	const data: ChartDataPoint[] = []
	const seasons: number[] = []

	for (const [seasonNumber] of Object.entries(ratings.allEpisodeRatings)) {
		const seasonNum = Number.parseInt(seasonNumber, 10)
		seasons.push(seasonNum)
		for (const episode of votedEpisodes(ratings, seasonNum)) {
			data.push({
				episodeIndex,
				[`season${seasonNum}`]: episode.rating,
				[`episode${seasonNum}`]: episode,
			})
			episodeIndex++
		}
	}

	return { data, seasons }
}
