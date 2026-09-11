/** URL of the thumbnail endpoint for one show. */
export function getPosterImageUrl(imdbId: string): string {
	return `/api/thumbnails/${imdbId}`
}
