import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'

import { createDb } from '@/db/connection'
import { thumbnail } from '@/db/tables'
import { imdbIdSchema } from '@/lib/imdb/ratings'
import { getStorage } from '@/lib/images/s3'

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
					return new Response(null, { status: 404 })
				}

				return new Response(Buffer.from(stored.data), {
					headers: {
						'content-type': stored.contentType ?? 'application/octet-stream',
						'cache-control': 'public, max-age=31536000, immutable',
					},
				})
			},
		},
	},
})
