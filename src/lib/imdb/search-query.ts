import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

/**
 * Search results through the server-function boundary. The handler imports
 * the implementation lazily so the server-only module graph (postgres)
 * never reaches the client bundle.
 */
export const getSearchResults = createServerFn()
	.validator(z.object({ query: z.string() }))
	.handler(async ({ data }) => {
		const { createDb } = await import('@/db/connection')
		const { fetchSuggestions } = await import('@/lib/imdb/search')
		return fetchSuggestions(createDb(), data.query, 50)
	})

export const searchResultsQuery = (scrapeVersion: string, query: string) =>
	queryOptions({
		queryKey: ['search', scrapeVersion, query],
		queryFn: () => getSearchResults({ data: { query } }),
		staleTime: Number.POSITIVE_INFINITY,
	})
