import { queryOptions } from '@tanstack/react-query'

import { getRatings } from '@/lib/imdb/ratings'

export const ratingsQuery = (scrapeVersion: string, showId: string) =>
	queryOptions({
		queryKey: ['ratings', scrapeVersion, showId],
		// react-query rejects undefined query data, which would turn the
		// loader's notFound() path into a 500.
		queryFn: async () => (await getRatings({ data: { showId } })) ?? null,
		staleTime: Number.POSITIVE_INFINITY,
	})
