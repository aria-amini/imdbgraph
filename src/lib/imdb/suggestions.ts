import { z } from 'zod'

const suggestionSchema = z.object({
	imdbId: z.string(),
	title: z.string(),
	startYear: z.string(),
	endYear: z.string().nullable(),
	rating: z.number(),
	numVotes: z.number(),
})

export type Suggestion = z.infer<typeof suggestionSchema>

export async function fetchSuggestionsFromApi(
	query: string,
): Promise<Suggestion[]> {
	if (!query) return []

	const response = await fetch(
		`/api/suggestions?q=${encodeURIComponent(query)}`,
	)
	if (!response.ok) {
		throw new Error(`Suggestions request failed: ${response.status}`)
	}

	return z.array(suggestionSchema).parse(await response.json())
}
