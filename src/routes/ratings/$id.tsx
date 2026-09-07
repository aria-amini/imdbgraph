import { createFileRoute, notFound } from '@tanstack/react-router'

import { Navbar } from '@/components/navbar'
import { RatingsView } from '@/components/ratings-view'
import { SearchBar } from '@/components/search-bar'
import { showImageQuery } from '@/lib/images/image-query'
import { getRatings, imdbIdSchema } from '@/lib/imdb/ratings'
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

export const Route = createFileRoute('/ratings/$id')({
	component: Ratings,
	loader: async ({ params, context: { queryClient } }) => {
		const showId = imdbIdSchema.safeParse(params.id)
		if (!showId.success) {
			throw notFound()
		}

		// The poster streams in through Suspense; only ratings block the page.
		void queryClient.prefetchQuery(showImageQuery(showId.data))

		const ratings = await getRatings({ data: { showId: showId.data } })
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
				center={
					<SearchBar
						className="w-full md:mx-auto md:max-w-md"
						fullWidthDropdown
					/>
				}
			/>
			<main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 lg:px-8 lg:py-8">
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
