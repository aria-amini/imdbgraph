import { desc, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

import { show } from '@/db/tables'

/** Finds up to five shows matching a fuzzy title query. */
export async function fetchSuggestions(db: NodePgDatabase, q: string) {
	if (!q) {
		throw new Error('Empty search parameter (q)')
	}

	return await db
		.select()
		.from(show)
		.where(sql`${q}::text <% ${show.title}`)
		.orderBy(desc(show.numVotes))
		.limit(5)
}
