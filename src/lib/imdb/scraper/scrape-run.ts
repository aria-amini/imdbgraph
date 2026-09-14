import type { QueryClient } from '@tanstack/react-query'
import { queryOptions } from '@tanstack/react-query'
import { createServerFn } from '@tanstack/react-start'
import { desc } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

import { createDb } from '@/db/connection'
import { scrapeRun } from '@/db/tables'

/** Returns the completion time of the most recent IMDb data scrape. */
export async function latestScrapeRun(
	db: NodePgDatabase,
): Promise<string | null> {
	const [latestRun] = await db
		.select({ completedAt: scrapeRun.completedAt })
		.from(scrapeRun)
		.orderBy(desc(scrapeRun.completedAt))
		.limit(1)

	return latestRun?.completedAt.toISOString() ?? null
}

/** Loads the latest scrape completion time through the server-function boundary. */
export const getLatestScrapeRun = createServerFn().handler(() =>
	latestScrapeRun(createDb()),
)

const SCRAPE_INTERVAL_MS = 24 * 60 * 60 * 1000
const OVERDUE_REFETCH_MS = 10 * 60 * 1000

export const latestScrapeRunQuery = (staleTime: number) =>
	queryOptions({
		queryKey: ['latest-scrape-run'],
		queryFn: () => getLatestScrapeRun(),
		staleTime,
	})

/**
 * Scrapes are guaranteed at least a day apart and never run early, so the
 * last completion time stays authoritative until the next one is due.
 * Overdue caches poll on a short interval until the new scrape lands.
 */
export function scrapeRunStaleTime(completedAt: string | null | undefined) {
	if (!completedAt) {
		return 0
	}
	const nextScrapeAt = Date.parse(completedAt) + SCRAPE_INTERVAL_MS
	return Math.max(nextScrapeAt - Date.now(), OVERDUE_REFETCH_MS)
}

/** Stable version token for per-scrape query keys before any scrape exists. */
export function scrapeVersion(queryClient: QueryClient): string {
	return (
		queryClient.getQueryData<string>(latestScrapeRunQuery(0).queryKey) ?? 'none'
	)
}
