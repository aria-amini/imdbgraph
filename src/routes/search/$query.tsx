import { Star } from '@phosphor-icons/react/dist/ssr'
import { createFileRoute } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'
import { cn } from 'cn'

import { Navbar } from '@/components/navbar'
import { SearchBar } from '@/components/search-bar'
import { scrapeVersion } from '@/lib/imdb/scrape-run-query'
import { searchResultsQuery } from '@/lib/imdb/search-query'
import type { Suggestion } from '@/lib/imdb/suggestions'
import { formatYears } from '@/lib/imdb/types'
import { usePreloadRatingsChunk } from '@/lib/preload-ratings-chunk'

function SearchSkeleton() {
	return (
		<>
			<Navbar
				center={
					<SearchBar
						className="w-full md:mx-auto md:max-w-md"
						fullWidthDropdown
					/>
				}
			/>
			<main
				aria-busy="true"
				className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6"
			>
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
			</main>
		</>
	)
}

export const Route = createFileRoute('/search/$query')({
	component: SearchResults,
	pendingComponent: SearchSkeleton,
	loader: async ({ params, context: { queryClient } }) => {
		const query = params.query.trim()
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
		<>
			<Navbar
				center={
					<SearchBar
						className={cn('w-full md:mx-auto md:max-w-md')}
						fullWidthDropdown
					/>
				}
			/>
			<main className={cn('mx-auto w-full max-w-3xl px-4 py-10 sm:px-6')}>
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
			</main>
		</>
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
