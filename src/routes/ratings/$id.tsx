import { createFileRoute, notFound } from '@tanstack/react-router'

import { Graph } from '@/components/graph'
import { Page } from '@/components/page'
import { votedEpisodes } from '@/lib/imdb/episodes'
import { getRatings } from '@/lib/imdb/ratings'
import { imdbIdSchema, type Ratings } from '@/lib/imdb/types'

function hasRatings(ratings: Ratings): boolean {
	return Object.keys(ratings.allEpisodeRatings).some(
		(seasonNum) => votedEpisodes(ratings, Number(seasonNum)).length > 0,
	)
}

export const Route = createFileRoute('/ratings/$id')({
	component: Ratings,
	loader: async ({ params }) => {
		const showId = imdbIdSchema.safeParse(params.id)
		if (!showId.success) {
			throw notFound()
		}

		const ratings = await getRatings({ data: { showId: showId.data } })

		if (!ratings) {
			throw notFound()
		}

		return ratings
	},
})

function Ratings() {
	const ratings = Route.useLoaderData()

	return (
		<Page width="wide">
			{!hasRatings(ratings) ? (
				<h1 className="pt-8 text-center text-6xl leading-tight">
					No Ratings Found
				</h1>
			) : (
				<Graph ratings={ratings} />
			)}
		</Page>
	)
}
