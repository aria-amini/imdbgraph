import { createFileRoute } from '@tanstack/react-router'

import { createDb } from '@/db/connection'
import { fetchSuggestions } from '@/lib/imdb/search'

export const Route = createFileRoute('/api/suggestions')({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const url = new URL(request.url)
				const q = url.searchParams.get('q')

				if (!q) {
					console.error('Empty parameter')
					return new Response(JSON.stringify([]))
				}

				const shows = await fetchSuggestions(createDb(), q)
				return new Response(JSON.stringify(shows), {
					headers: {
						'CDN-Cache-Control':
							'public, s-maxage=86400, stale-while-revalidate=3600',
						'Cache-Control': 'public, max-age=0, must-revalidate',
					},
				})
			},
		},
	},
})
