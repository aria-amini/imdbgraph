import { createServerFn } from '@tanstack/react-start'
import { asc, eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { z } from 'zod'

import { createDb } from '@/db/connection'
import { episode, show } from '@/db/tables'
import { imdbIdSchema } from '@/lib/imdb/imdb-id'
import type { Episode, Ratings } from '@/lib/imdb/types'

export { imdbIdSchema }

/** Loads ratings for a show through the server-function boundary. */
export const getRatings = createServerFn()
	.validator(z.object({ showId: imdbIdSchema }))
	.handler(async ({ data }) => {
		const db = createDb()
		return getRatingsDb(db, data.showId)
	})

/** Loads a show's metadata and episodes, grouped by season. */
export async function getRatingsDb(
	db: NodePgDatabase,
	showId: string,
): Promise<Ratings | undefined> {
	const result = await db.select().from(show).where(eq(show.imdbId, showId))
	if (!result.length) {
		return undefined
	}
	const foundShow = result[0]
	if (!foundShow) {
		return undefined
	}

	const episodes = await db
		.select({
			episodeId: episode.episodeId,
			title: episode.title,
			seasonNum: episode.seasonNum,
			episodeNum: episode.episodeNum,
			numVotes: episode.numVotes,
			rating: episode.rating,
		})
		.from(episode)
		.where(eq(episode.showId, showId))
		.orderBy(asc(episode.seasonNum), asc(episode.episodeNum))

	const groupedEpisodes: Record<number, Record<number, Episode>> = {}
	for (const episodeInfo of episodes) {
		const { seasonNum, episodeNum } = episodeInfo

		groupedEpisodes[seasonNum] ??= {}
		groupedEpisodes[seasonNum][episodeNum] = episodeInfo
	}

	return { show: foundShow, allEpisodeRatings: groupedEpisodes }
}
