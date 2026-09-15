import type { ComponentType } from 'react'

import { shows } from '@/lib/imdb/__fixtures__/shows'

/** Unwraps a file route's component for direct rendering in tests. */
export function routeComponent({
	options,
}: {
	options: { component?: ComponentType }
}): ComponentType {
	if (!options.component) throw new Error('Route has no component')
	return options.component
}

export const searchResults = [
	'tt0417299',
	'tt0944947',
	'tt0903747',
	'tt11126994',
	'tt0306414',
].map((imdbId) => {
	const show = shows.find((fixture) => fixture.imdbId === imdbId)
	if (!show) throw new Error(`Search result fixture not found: ${imdbId}`)
	return show
})
