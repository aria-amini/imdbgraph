import { createFileRoute } from '@tanstack/react-router'

import { Navbar } from '@/components/navbar'
import { SearchBar } from '@/components/search-bar'

export const Route = createFileRoute('/')({
	component: Home,
})

function Home() {
	return (
		<div className="flex flex-1 flex-col">
			<Navbar />
			<main className="flex flex-1 flex-col">
				<section>
					<div className="mx-auto max-w-4xl px-4 py-14 md:px-6 md:py-24">
						<h1 className="text-center text-5xl font-black tracking-tight text-balance">
							IMDbGraph.org
						</h1>
						<p className="text-muted-foreground text-center text-sm leading-7 not-first:mt-3">
							Episode ratings for every TV series.
						</p>

						<SearchBar className="mx-auto mt-10 max-w-xl" />
					</div>
				</section>
			</main>
		</div>
	)
}
