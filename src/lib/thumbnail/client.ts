import { queryOptions } from '@tanstack/react-query'

import { getShowImage } from '@/lib/thumbnail/server'

/** URL of the thumbnail endpoint for one show. */
export function getPosterImageUrl(imdbId: string): string {
	return `/api/thumbnails/${imdbId}`
}

/** Client-safe query definition for a show's poster metadata. */
export const showImageQuery = (imdbId: string) =>
	queryOptions({
		queryKey: ['show-image', imdbId],
		queryFn: () => getShowImage({ data: imdbId }),
	})
