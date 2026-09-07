import { createServerFn } from '@tanstack/react-start'
import { desc, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { z } from 'zod'

import { createDb } from '@/db/connection'
import { show } from '@/db/tables'

/** Finds up to five shows matching a fuzzy title query. */
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
	.handler(async ({ data }) => fetchSuggestions(createDb(), data.query, 50))
