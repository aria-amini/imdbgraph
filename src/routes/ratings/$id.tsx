import { createFileRoute, notFound } from '@tanstack/react-router'

import { Graph } from '@/components/graph'
import { Navbar } from '@/components/navbar'
import { SearchBar } from '@/components/search-bar'
import { getRatings } from '@/lib/imdb/ratings'
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
	loader: async ({ params }) => {
		const showId = params.id
		if (!showId) {
			throw notFound()
		}

		const ratings = await getRatings({ data: { showId } })

		if (!ratings) {
			throw notFound()
		}

		return ratings
	},
})

function Ratings() {
	const ratings = Route.useLoaderData()

	return (
		<>
			<Navbar center={<SearchBar className="w-full max-w-md" />} />
			<main className="px-2 py-3 sm:px-4 lg:px-8">
				{!hasRatings(ratings) ? (
					<h1 className="pt-8 text-center text-6xl leading-tight">
						No Ratings Found
					</h1>
				) : (
					<Graph ratings={ratings} />
				)}
			</main>
		</>
	)
}
