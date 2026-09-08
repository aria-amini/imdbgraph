import { createFileRoute, notFound } from '@tanstack/react-router'

import { Navbar } from '@/components/navbar'
import { RatingsView } from '@/components/ratings-view'
import { SearchBar } from '@/components/search-bar'
import { showImageQuery } from '@/lib/images/image-query'
import { imdbIdSchema } from '@/lib/imdb/ratings'
import { ratingsQuery } from '@/lib/imdb/ratings-query'
import { scrapeVersion } from '@/lib/imdb/scrape-run-query'
import { type Ratings } from '@/lib/imdb/types'

function hasRatings(ratings: Ratings): boolean {
	for (const seasonRatings of Object.values(ratings.allEpisodeRatings)) {
		for (const episode of Object.values(seasonRatings)) {
			if (episode.numVotes > 0) {
				return true
			}
		}
	}
	return false
}

function RatingsSkeleton() {
	return (
		<>
			<Navbar
				center={<SearchBar className="w-full md:mx-auto md:max-w-md" />}
			/>
			<main
				aria-busy="true"
				className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6 lg:px-8 lg:py-8"
			>
				<header className="border-border mb-8 flex gap-5 border-b pb-6 lg:gap-8">
					<div className="border-border bg-muted aspect-[2/3] w-24 shrink-0 animate-pulse border sm:w-36 lg:w-44" />
					<div className="flex-1 space-y-4 pt-2">
						<div className="bg-muted h-10 w-2/3 animate-pulse sm:h-14" />
						<div className="bg-muted h-4 w-1/3 animate-pulse" />
					</div>
				</header>
				<div className="bg-muted h-96 w-full animate-pulse" />
			</main>
		</>
	)
}

export const Route = createFileRoute('/ratings/$id')({
	component: Ratings,
	pendingComponent: RatingsSkeleton,
	loader: async ({ params, context: { queryClient } }) => {
		const showId = imdbIdSchema.safeParse(params.id)
		if (!showId.success) {
			throw notFound()
		}

		// The poster streams in through Suspense; only ratings block the page.
		void queryClient.prefetchQuery(showImageQuery(showId.data))

		const ratings = await queryClient.ensureQueryData(
			ratingsQuery(scrapeVersion(queryClient), showId.data),
		)
		if (!ratings) {
			throw notFound()
		}

		return { ratings }
	},
})

function Ratings() {
	const { ratings } = Route.useLoaderData()

	return (
		<>
			<Navbar
				center={<SearchBar className="w-full md:mx-auto md:max-w-md" />}
			/>
			<main className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6 lg:px-8 lg:py-8">
				{!hasRatings(ratings) ? (
					<h1 className="py-24 text-center text-3xl font-black tracking-tight text-balance sm:py-32 sm:text-5xl">
						No Ratings Found
					</h1>
				) : (
					<RatingsView ratings={ratings} />
				)}
			</main>
		</>
	)
}
