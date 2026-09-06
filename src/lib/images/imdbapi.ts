import { z } from 'zod'

const API_BASE_URL = 'https://api.imdbapi.dev'
const METADATA_TIMEOUT_MS = 5_000

const primaryImageSchema = z.object({
	url: z.string().url(),
	width: z.number().int().positive(),
	height: z.number().int().positive(),
})

const titleResponseSchema = z.object({
	primaryImage: primaryImageSchema.nullish(),
})

export interface RemoteImage {
	url: string
	width: number
	height: number
}

/**
 * Fetches a show's primary image metadata from imdbapi.dev. Returns null when
 * the API definitively has no image for the title; throws on transient
 * failures so callers can retry later without caching a wrong result.
 */
export async function fetchPrimaryImage(
	imdbId: string,
): Promise<RemoteImage | null> {
	const response = await fetch(`${API_BASE_URL}/titles/${imdbId}`, {
		headers: { accept: 'application/json' },
		signal: AbortSignal.timeout(METADATA_TIMEOUT_MS),
	})
	if (!response.ok) {
		// Our shows come from IMDb's own datasets, so a miss here means the API
		// has no usable record for this title.
		if (response.status === 404) {
			return null
		}
		throw new Error(`imdbapi.dev request failed with status ${response.status}`)
	}

	const parsed = titleResponseSchema.safeParse(await response.json())
	if (!parsed.success) {
		throw new Error('imdbapi.dev returned an unexpected payload')
	}
	return parsed.data.primaryImage ?? null
}
