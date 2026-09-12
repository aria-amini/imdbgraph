import { z } from 'zod'

const API_BASE_URL = 'https://api.tvmaze.com'
const METADATA_TIMEOUT_MS = 5_000
const ALLOWED_POSTER_HOSTS = new Set(['static.tvmaze.com'])

const imageSchema = z.object({
	original: z.string().url().optional(),
	medium: z.string().url().optional(),
})

const showLookupSchema = z.object({
	image: imageSchema.nullish(),
	status: z.string().nullish(),
	network: z.object({ name: z.string() }).nullish(),
	webChannel: z.object({ name: z.string() }).nullish(),
	schedule: z
		.object({
			time: z.string().nullish(),
			days: z.array(z.string()).nullish(),
		})
		.nullish(),
})

/** Airing metadata TVMaze carries alongside the poster. */
export interface ShowAiring {
	status: string | null
	network: string | null
	airsDays: string[]
	airsTime: string | null
}

/**
 * Poster and airing metadata for one show. TVMaze's API response carries no
 * image dimensions, so width and height stay unknown until render.
 */
export interface ShowEnrichment extends ShowAiring {
	posterUrl: string
}

/**
 * Resolves an IMDb title to its primary poster and airing metadata via
 * TVMaze's IMDb lookup. Returns null when TVMaze definitively has no show or
 * image for the ID; throws on transient failures so callers can retry without
 * caching a wrong result. TVMaze data is CC BY-SA; the UI must credit TVmaze.
 */
export async function fetchShowEnrichment(
	imdbId: string,
): Promise<ShowEnrichment | null> {
	const signal = AbortSignal.timeout(METADATA_TIMEOUT_MS)
	let response = await fetch(
		`${API_BASE_URL}/lookup/shows?imdb=${encodeURIComponent(imdbId)}`,
		{
			headers: { accept: 'application/json' },
			redirect: 'manual',
			signal,
		},
	)
	// TVmaze resolves IMDb IDs with a documented 301 to /shows/:id.
	// Validate that one hop ourselves; never follow arbitrary redirects.
	if (response.status === 301) {
		const location = response.headers.get('location')
		await response.body?.cancel()
		const target = location ? new URL(location, API_BASE_URL) : null
		if (
			!target ||
			target.origin !== API_BASE_URL ||
			target.username ||
			target.password ||
			!/^\/shows\/\d+$/.test(target.pathname) ||
			target.search ||
			target.hash
		) {
			throw new Error('unsupported tvmaze lookup redirect')
		}
		response = await fetch(target, {
			headers: { accept: 'application/json' },
			redirect: 'error',
			signal,
		})
	}

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
	const time = parsed.data.schedule?.time?.trim()
	return {
		posterUrl: parsePosterUrl(url).href,
		status: parsed.data.status ?? null,
		network: parsed.data.network?.name ?? parsed.data.webChannel?.name ?? null,
		airsDays: parsed.data.schedule?.days ?? [],
		airsTime: time ? time : null,
	}
}

/** Validate upstream URLs again at the download boundary. */
export function parsePosterUrl(value: string): URL {
	const url = new URL(value)
	if (
		url.protocol !== 'https:' ||
		!ALLOWED_POSTER_HOSTS.has(url.hostname) ||
		url.username ||
		url.password ||
		url.port
	) {
		throw new Error('unsupported poster URL')
	}
	return url
}
