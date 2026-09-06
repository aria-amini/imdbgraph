import { z } from 'zod'

const API_BASE_URL = 'https://api.tvmaze.com'
const METADATA_TIMEOUT_MS = 5_000

const imageSchema = z.object({
	original: z.string().url().optional(),
	medium: z.string().url().optional(),
})

const showLookupSchema = z.object({
	image: imageSchema.nullish(),
})

export interface RemoteImage {
	url: string
	width: number | null
	height: number | null
}

/**
 * Resolves an IMDb title to its primary poster via TVMaze's IMDb lookup.
 * Returns null when TVMaze definitively has no show or image for the ID;
 * throws on transient failures so callers can retry without caching a wrong
 * result. TVMaze data is CC BY-SA; the UI must credit TVmaze.
 */
export async function fetchShowImage(
	imdbId: string,
): Promise<RemoteImage | null> {
	const response = await fetch(`${API_BASE_URL}/lookup/shows?imdb=${imdbId}`, {
		headers: { accept: 'application/json' },
		signal: AbortSignal.timeout(METADATA_TIMEOUT_MS),
	})
	if (!response.ok) {
		if (response.status === 404) {
			return null
		}
		throw new Error(`tvmaze lookup failed with status ${response.status}`)
	}

	const parsed = showLookupSchema.safeParse(await response.json())
	if (!parsed.success) {
		throw new Error('tvmaze returned an unexpected payload')
	}
	const url = parsed.data.image?.original ?? parsed.data.image?.medium
	if (!url) {
		return null
	}
	return { url, width: null, height: null }
}
