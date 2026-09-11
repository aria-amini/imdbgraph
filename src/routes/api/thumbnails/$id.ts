import { createFileRoute } from '@tanstack/react-router'

import { createDb } from '@/db/connection'
import { getStoredImage } from '@/lib/images/show-image'
import { imdbIdSchema } from '@/lib/imdb/ratings'

export const Route = createFileRoute('/api/thumbnails/$id')({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const parsed = imdbIdSchema.safeParse(params.id)
				if (!parsed.success) {
					return new Response(null, { status: 400 })
				}

				const stored = await getStoredImage(createDb(), parsed.data)
				if (!stored) {
					return new Response(null, { status: 404 })
				}

				return new Response(Buffer.from(stored.data), {
					headers: {
						'content-type': stored.contentType ?? 'application/octet-stream',
						// The URL is keyed by IMDb id, not content version, so long
						// immutable caching would hide a re-fetched poster for a year.
						'cache-control': 'public, max-age=86400',
					},
				})
			},
		},
	},
})
