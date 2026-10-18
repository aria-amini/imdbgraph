import { createFileRoute } from '@tanstack/solid-router'
import { Link } from '@tanstack/solid-router'
import { cn } from 'cn'
import { For, Show } from 'solid-js'
import { z } from 'zod'

import { StarFill } from '@/components/icons'
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
			<div class="bg-muted h-9 w-56 animate-pulse" />
			<div class="border-border mt-8 border-y">
				<For each={[0, 1, 2, 3, 4]}>
					{() => (
						<div class="border-border flex items-center justify-between border-b px-2 py-4 last:border-b-0">
							<div class="space-y-2">
								<div class="bg-muted h-4 w-40 animate-pulse" />
								<div class="bg-muted h-3 w-24 animate-pulse" />
							</div>
							<div class="bg-muted h-4 w-10 animate-pulse" />
						</div>
					)}
				</For>
			</div>
		</Page>
	)
}

const searchParamsSchema = z.object({
	q: z
		.string()
		.transform((value) => value.trim())
		.catch(''),
})

export const Route = createFileRoute('/search')({
	// An empty or absent q must stay absent: emitting `q: ''` makes the
	// router rewrite bare `/search` into `/search?q=` (normalizing search)
	// before rendering. Only non-empty strings are kept.
	validateSearch: (search) => {
		const { q } = searchParamsSchema.parse(search)

		return q === '' ? {} : { q }
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
	const data = Route.useLoaderData()

	return (
		<Page width="narrow">
			<h1 class={cn('text-3xl font-black tracking-tight sm:text-4xl')}>
				Search results
			</h1>
			<p class={cn('text-muted-foreground mt-2 text-sm')}>
				Matches for “{data().query}”
			</p>

			<Show
				when={data().results.length > 0}
				fallback={
					<p class={cn('text-muted-foreground mt-12 text-center text-sm')}>
						No TV shows found. Try a different search.
					</p>
				}
			>
				<div class={cn('mt-8 border-y border-border')}>
					<For each={data().results}>
						{(show) => <ShowResult show={show} />}
					</For>
				</div>
			</Show>
		</Page>
	)
}

function ShowResult(props: { show: Suggestion }) {
	return (
		<Link
			to="/ratings/$id"
			params={{ id: props.show.imdbId }}
			class={cn(
				'flex items-center gap-4 border-b border-border px-2 py-4 transition-colors last:border-b-0 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none',
			)}
		>
			<SuggestionPoster imdbId={props.show.imdbId} title={props.show.title} />
			<div class={cn('min-w-0 flex-1')}>
				<span class={cn('block truncate font-medium')}>{props.show.title}</span>
				<span class={cn('text-muted-foreground mt-1 block text-xs')}>
					{formatYears(props.show)}
				</span>
			</div>
			<div class={cn('flex shrink-0 items-center gap-1 text-sm')}>
				<span>{props.show.rating.toFixed(1)}</span>
				<StarFill aria-hidden="true" class={cn('text-primary size-4')} />
			</div>
		</Link>
	)
}
