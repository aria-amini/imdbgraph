import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { desc, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { z } from 'zod'

import { createDb } from '@/db/connection'
import { show } from '@/db/tables'

/** Fuzzy-matches show titles, best-voted first. */
export async function searchShows(
	db: NodePgDatabase,
	query: string,
): Promise<Suggestion[]> {
	return db
		.select({
			imdbId: show.imdbId,
			title: show.title,
			startYear: show.startYear,
			endYear: show.endYear,
			rating: show.rating,
			numVotes: show.numVotes,
		})
		.from(show)
		.where(sql`${query}::text <% ${show.title}`)
		.orderBy(desc(show.numVotes))
		.limit(50)
}

export const getSearchResults = createServerFn()
	.validator(z.object({ query: z.string().min(1) }))
	.handler(({ data }) => searchShows(createDb(), data.query))

const MAX_SUGGESTIONS = 5

/** Top matches for the searchbar dropdown, capped at five rows. */
export async function suggestionsFor(db: NodePgDatabase, query: string) {
	return (await searchShows(db, query)).slice(0, MAX_SUGGESTIONS)
}

export const searchResultsQuery = (scrapeVersion: string, query: string) =>
	queryOptions({
		queryKey: ['search', scrapeVersion, query],
		queryFn: () => getSearchResults({ data: { query } }),
		staleTime: Number.POSITIVE_INFINITY,
	})

const suggestionSchema = z.object({
	imdbId: z.string(),
	title: z.string(),
	startYear: z.string(),
	endYear: z.string().nullable(),
	rating: z.number(),
	numVotes: z.number(),
})

export type Suggestion = z.infer<typeof suggestionSchema>

/** Fetches and validates title suggestions from the application API. */
export async function fetchSuggestionsFromApi(
	query: string,
): Promise<Suggestion[]> {
	if (!query) return []

	const response = await fetch(
		`/api/suggestions?q=${encodeURIComponent(query)}`,
	)
	if (!response.ok) {
		throw new Error(`Suggestions request failed: ${response.status}`)
	}

	return z.array(suggestionSchema).parse(await response.json())
}
