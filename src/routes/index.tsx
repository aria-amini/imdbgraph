import { createFileRoute } from '@tanstack/solid-router'

import { SearchBar } from '@/components/search-bar'
import { usePreloadRatingsChunk } from '@/lib/imdb/ratings'

export const Route = createFileRoute('/')({
	component: Home,
})

function Home() {
	usePreloadRatingsChunk()

	return (
		<div class="flex flex-1 flex-col">
			<main class="flex flex-1 flex-col">
				<section>
					<div class="mx-auto max-w-4xl px-4 py-14 md:px-6 md:py-24">
						<h1 class="text-center text-5xl font-black tracking-tight text-balance">
							IMDbGraph.org
						</h1>
						<p class="text-muted-foreground text-center text-sm leading-7 not-first:mt-3">
							Episode ratings for every TV series.
						</p>

						<SearchBar class="mx-auto mt-10 max-w-xl" variant="standalone" />
					</div>
				</section>
			</main>
		</div>
	)
}
