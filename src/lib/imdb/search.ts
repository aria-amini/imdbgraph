import { createServerFn } from '@tanstack/react-start'
import { desc, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { z } from 'zod'

import { show } from '@/db/tables'

/** Fuzzy-matches show titles, best-voted first. */
export async function fetchSuggestions(
	db: NodePgDatabase,
	q: string,
	limit = 5,
) {
	if (!q) {
		throw new Error('Empty search parameter (q)')
	}

	return await db
		.select()
		.from(show)
		.where(sql`${q}::text <% ${show.title}`)
		.orderBy(desc(show.numVotes))
		.limit(limit)
}

export const getSearchResults = createServerFn()
	.validator(z.object({ query: z.string() }))
	.handler(async ({ data }) => {
		// Lazy import keeps postgres out of the client bundle.
		const { createDb } = await import('@/db/connection')
		return fetchSuggestions(createDb(), data.query, 50)
	})
