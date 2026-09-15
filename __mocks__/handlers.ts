import { http, HttpResponse } from 'msw'

import { imdbIdSchema } from '@/lib/imdb/types'

import suggestions from './data/suggestions.json' with { type: 'json' }

export default [
	http.get('/api/thumbnails/:imdbId', ({ params }) => {
		if (!imdbIdSchema.safeParse(params.imdbId).success) {
			return new HttpResponse(null, { status: 400 })
		}

		return new HttpResponse(null, { status: 404 })
	}),
	http.get('/api/suggestions', () => {
		return HttpResponse.json(suggestions)
	}),
]
