import { queryOptions } from '@tanstack/react-query'

import { getShowImage } from '@/lib/images/show-image'

/** Client-safe query definition for a show's poster metadata. */
export const showImageQuery = (imdbId: string) =>
	queryOptions({
		queryKey: ['show-image', imdbId],
		queryFn: () => getShowImage({ data: imdbId }),
	})
