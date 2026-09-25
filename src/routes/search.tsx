import { Star } from '@phosphor-icons/react/dist/ssr'
import { createFileRoute } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'
import { cn } from 'cn'

import { Page } from '@/components/page'
import { SuggestionPoster } from '@/components/suggestion-poster'
import { usePreloadRatingsChunk } from '@/lib/imdb/ratings'
import { scrapeVersion } from '@/lib/imdb/scraper/scrape-run'
import { searchResultsQuery } from '@/lib/imdb/search'
import type { Suggestion } from '@/lib/imdb/search'
import { formatYears } from '@/lib/imdb/types'

function SearchSkeleton() {
	return (
		<Page width="narrow" busy>
			<div className="bg-muted h-9 w-56 animate-pulse" />
			<div className="border-border mt-8 border-y">
				{Array.from({ length: 5 }, (_, row) => (
					<div
						key={row}
						className="border-border flex items-center justify-between border-b px-2 py-4 last:border-b-0"
					>
						<div className="space-y-2">
							<div className="bg-muted h-4 w-40 animate-pulse" />
							<div className="bg-muted h-3 w-24 animate-pulse" />
						</div>
						<div className="bg-muted h-4 w-10 animate-pulse" />
					</div>
				))}
			</div>
		</Page>
	)
}

export const Route = createFileRoute('/search')({
	// An empty or absent q must stay absent: emitting `q: ''` makes the
	// router rewrite bare `/search` into `/search?q=` (normalizing search)
	// before rendering. Only non-empty strings are kept.
	validateSearch: (search: Record<string, unknown>): { q?: string } => {
		const q = search.q
		return typeof q === 'string' && q.trim() !== '' ? { q: q.trim() } : {}
	},
	component: SearchResults,
	pendingComponent: SearchSkeleton,
	loaderDeps: ({ search: { q } }) => [q] as const,
	loader: async ({ deps: [q], context: { queryClient } }) => {
		const query = q ?? ''
		if (query === '') {
			return { query, results: [] }
		}
		return {
			query,
			results: await queryClient.ensureQueryData(
				searchResultsQuery(scrapeVersion(queryClient), query),
			),
		}
	},
})

function SearchResults() {
	usePreloadRatingsChunk()
	const { query, results } = Route.useLoaderData()

	return (
		<Page width="narrow">
			<h1 className={cn('text-3xl font-black tracking-tight sm:text-4xl')}>
				Search results
			</h1>
			<p className={cn('text-muted-foreground mt-2 text-sm')}>
				Matches for “{query}”
			</p>

			{results.length > 0 ? (
				<div className={cn('mt-8 border-y border-border')}>
					{results.map((show) => (
						<ShowResult key={show.imdbId} show={show} />
					))}
				</div>
			) : (
				<p className={cn('text-muted-foreground mt-12 text-center text-sm')}>
					No TV shows found. Try a different search.
				</p>
			)}
		</Page>
	)
}

function ShowResult({ show }: { show: Suggestion }) {
	return (
		<Link
			to="/ratings/$id"
			params={{ id: show.imdbId }}
			className={cn(
				'flex items-center gap-4 border-b border-border px-2 py-4 transition-colors last:border-b-0 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none',
			)}
		>
			<SuggestionPoster imdbId={show.imdbId} title={show.title} />
			<div className={cn('min-w-0 flex-1')}>
				<span className={cn('block truncate font-medium')}>{show.title}</span>
				<span className={cn('text-muted-foreground mt-1 block text-xs')}>
					{formatYears(show)}
				</span>
			</div>
			<div className={cn('flex shrink-0 items-center gap-1 text-sm')}>
				<span>{show.rating.toFixed(1)}</span>
				<Star
					aria-hidden="true"
					className={cn('text-primary size-4')}
					weight="fill"
				/>
			</div>
		</Link>
	)
}
