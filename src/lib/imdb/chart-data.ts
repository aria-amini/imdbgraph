import type { Episode, Ratings } from '@/lib/imdb/types'

export type ChartDataPoint = {
	episodeIndex: number
} & Record<`season${number}` | `episode${number}`, number | Episode | null>

export function transformRatingsData(ratings: Ratings): {
	data: ChartDataPoint[]
	seasons: number[]
} {
	let episodeIndex = 1
	const data: ChartDataPoint[] = []
	const seasons: number[] = []

	for (const [seasonNumber, seasonRatings] of Object.entries(
		ratings.allEpisodeRatings,
	)) {
		const seasonNum = Number.parseInt(seasonNumber, 10)
		seasons.push(seasonNum)
		for (const episode of Object.values(seasonRatings)) {
			if (episode.numVotes === 0 || episode.episodeNum <= 0) continue

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
