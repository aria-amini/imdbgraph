import { http, HttpResponse } from 'msw'

import suggestions from './data/suggestions.json' with { type: 'json' }

export default [
	http.get('/api/suggestions', () => {
		return HttpResponse.json(suggestions)
	}),
]
