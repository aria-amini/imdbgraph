import { queryOptions } from '@tanstack/react-query'

import { getSearchResults } from '@/lib/imdb/search'

export const searchResultsQuery = (scrapeVersion: string, query: string) =>
	queryOptions({
		queryKey: ['search', scrapeVersion, query],
		queryFn: () => getSearchResults({ data: { query } }),
		staleTime: Number.POSITIVE_INFINITY,
	})
