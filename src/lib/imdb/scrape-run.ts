import { createServerFn } from '@tanstack/react-start'
import { desc } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

import { createDb } from '@/db/connection'
import { scrapeRun } from '@/db/tables'

export const getLatestScrapeRun = createServerFn().handler(async () => {
	const db = createDb()
	return getLatestScrapeRunDb(db)
})

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
