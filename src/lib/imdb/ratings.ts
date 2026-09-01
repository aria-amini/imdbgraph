import { createDb } from '@/db/connection'
import { episode, show } from '@/db/tables'
import type { Episode, Ratings } from '@/lib/imdb/types'
import { createServerFn } from '@tanstack/react-start'
import { asc, eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { z } from 'zod'

const imdbIdSchema = z.string().regex(/^tt\d+$/)

export const getRatings = createServerFn()
	.inputValidator(z.object({ showId: imdbIdSchema }))
	.handler(async ({ data }) => {
		const db = createDb()
		return getRatingsDb(db, data.showId)
	})

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
