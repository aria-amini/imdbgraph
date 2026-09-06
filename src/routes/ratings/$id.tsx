import { createFileRoute, notFound } from '@tanstack/react-router'

import { Navbar } from '@/components/navbar'
import { RatingsView } from '@/components/ratings-view'
import { SearchBar } from '@/components/search-bar'
import { getShowImage } from '@/lib/images/thumbnail'
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
	loader: async ({ params }) => {
		const showId = imdbIdSchema.safeParse(params.id)
		if (!showId.success) {
			throw notFound()
		}

		const [ratings, image] = await Promise.all([
			getRatings({ data: { showId: showId.data } }),
			getShowImage({ data: showId.data }),
		])

		if (!ratings) {
			throw notFound()
		}

		return { ratings, image }
	},
})

function Ratings() {
	const { ratings, image } = Route.useLoaderData()

	return (
		<>
			<Navbar center={<SearchBar className="w-full" fullWidthDropdown />} />
			<main className="px-4 py-3 lg:px-8">
				{!hasRatings(ratings) ? (
					<h1 className="pt-8 text-center text-6xl leading-tight">
						No Ratings Found
					</h1>
				) : (
					<RatingsView ratings={ratings} image={image} />
				)}
			</main>
		</>
	)
}
