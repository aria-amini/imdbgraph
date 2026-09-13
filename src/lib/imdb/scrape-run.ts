import { createServerFn } from '@tanstack/react-start'
import { desc } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

import { scrapeRun } from '@/db/tables'

/** Loads the latest scrape completion time through the server-function boundary. */
export const getLatestScrapeRun = createServerFn().handler(async () => {
	// Lazy import keeps postgres out of the client bundle.
	const { createDb } = await import('@/db/connection')
	return getLatestScrapeRunDb(createDb())
})

/** Returns the completion time of the most recent IMDb data scrape. */
export async function getLatestScrapeRunDb(
	db: NodePgDatabase,
): Promise<string | null> {
	const [latestRun] = await db
		.select({ completedAt: scrapeRun.completedAt })
		.from(scrapeRun)
		.orderBy(desc(scrapeRun.completedAt))
		.limit(1)

	return latestRun?.completedAt.toISOString() ?? null
}
