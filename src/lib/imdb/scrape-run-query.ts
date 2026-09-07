import type { QueryClient } from '@tanstack/react-query'
import { queryOptions } from '@tanstack/react-query'

import { getLatestScrapeRun } from '@/lib/imdb/scrape-run'

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
