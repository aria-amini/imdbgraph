import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'

import { createDb } from '@/db/connection'
import { thumbnail } from '@/db/tables'
import { getStorage } from '@/lib/images/s3'
import { imdbIdSchema } from '@/lib/imdb/ratings'

export const Route = createFileRoute('/api/thumbnails/$id')({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const parsed = imdbIdSchema.safeParse(params.id)
				if (!parsed.success) {
					return new Response(null, { status: 400 })
				}

				const [row] = await createDb()
					.select({
						objectKey: thumbnail.objectKey,
						contentType: thumbnail.contentType,
					})
					.from(thumbnail)
					.where(eq(thumbnail.imdbId, parsed.data))
					.limit(1)
				if (!row?.objectKey) {
					return new Response(null, { status: 404 })
				}

				const stored = await getStorage().get(row.objectKey)
				if (!stored) {
					// The DB row references a lost object, so drop the stale row and
					// let the next view re-fetch the poster instead of 404ing forever.
					await createDb()
						.delete(thumbnail)
						.where(eq(thumbnail.imdbId, parsed.data))
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
