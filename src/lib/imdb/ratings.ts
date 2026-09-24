import { queryOptions } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { asc, eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { useEffect } from 'react'
import { z } from 'zod'

import { createDb } from '@/db/connection'
import { episode, show } from '@/db/tables'
import { imdbIdSchema, type Episode, type Ratings } from '@/lib/imdb/types'

/** Loads a show's metadata and episodes, grouped by season. */
export async function loadRatings(
	db: NodePgDatabase,
	showId: string,
): Promise<Ratings | undefined> {
	const [foundShow] = await db
		.select()
		.from(show)
		.where(eq(show.imdbId, showId))

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

/** Loads ratings for a show through the server-function boundary. */
export const getRatings = createServerFn()
	.validator(z.object({ showId: imdbIdSchema }))
	.handler(({ data }) => loadRatings(createDb(), data.showId))

export const ratingsQuery = (scrapeVersion: string, showId: string) =>
	queryOptions({
		queryKey: ['ratings', scrapeVersion, showId],
		// react-query rejects undefined query data, which would turn the
		// loader's notFound() path into a 500.
		queryFn: async () => (await getRatings({ data: { showId } })) ?? null,
		staleTime: Number.POSITIVE_INFINITY,
	})

/** Warms the ratings route chunk so the first show click skips its fetch. */
export function usePreloadRatingsChunk() {
	const router = useRouter()
	useEffect(() => {
		const route = router.looseRoutesById['/ratings/$id']

		if (route) void router.loadRouteChunk(route)
	}, [router])
}
