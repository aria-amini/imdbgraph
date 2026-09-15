import { createFileRoute, notFound } from '@tanstack/react-router'

import { Page } from '@/components/page'
import { RatingsView } from '@/components/ratings-view'
import { votedEpisodes } from '@/lib/imdb/episodes'
import { ratingsQuery } from '@/lib/imdb/ratings'
import { scrapeVersion } from '@/lib/imdb/scraper/scrape-run'
import { imdbIdSchema, type Ratings } from '@/lib/imdb/types'

function hasRatings(ratings: Ratings): boolean {
	return Object.keys(ratings.allEpisodeRatings).some(
		(seasonNum) => votedEpisodes(ratings, Number(seasonNum)).length > 0,
	)
}

function RatingsSkeleton() {
	return (
		<Page width="wide" busy>
			<header className="border-border mb-8 flex gap-5 border-b pb-6 lg:gap-8">
				<div className="border-border bg-muted aspect-[2/3] w-24 shrink-0 animate-pulse border sm:w-36 lg:w-44" />
				<div className="flex-1 space-y-4 pt-2">
					<div className="bg-muted h-10 w-2/3 animate-pulse sm:h-14" />
					<div className="bg-muted h-4 w-1/3 animate-pulse" />
				</div>
			</header>
			<div className="bg-muted h-96 w-full animate-pulse" />
		</Page>
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
		<Page width="wide">
			{!hasRatings(ratings) ? (
				<h1 className="py-24 text-center text-3xl font-black tracking-tight text-balance sm:py-32 sm:text-5xl">
					No Ratings Found
				</h1>
			) : (
				<RatingsView ratings={ratings} />
			)}
		</Page>
	)
}
