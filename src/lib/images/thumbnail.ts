import { createServerFn } from '@tanstack/react-start'

import { createDb } from '@/db/connection'
import { getShowImageDb } from '@/lib/images/thumbnail.server'
import { imdbIdSchema } from '@/lib/imdb/ratings'

export interface ShowImage {
	url: string
	width: number | null
	height: number | null
}

/** Loads a show's image through the server-function boundary. */
export const getShowImage = createServerFn({ method: 'GET' })
	.validator(imdbIdSchema)
	.handler(async ({ data: imdbId }) => {
		try {
			return await getShowImageDb(createDb(), imdbId)
		} catch (error) {
			console.warn(`Failed to load image for ${imdbId}`, error)
			return null
		}
	})
