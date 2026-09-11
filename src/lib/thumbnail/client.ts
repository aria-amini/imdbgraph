import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'

import { imdbIdSchema } from '@/lib/imdb/imdb-id'

/**
 * Loads a show's image through the server-function boundary. The handler
 * imports the implementation lazily so the server-only module graph
 * (postgres, AWS SDK) never reaches the client bundle.
 */
export const getShowImage = createServerFn({ method: 'GET' })
	.validator(imdbIdSchema)
	.handler(async ({ data: imdbId }) => {
		const { loadShowImage } = await import('./server')
		return loadShowImage(imdbId)
	})

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
