import type { QueryClient } from '@tanstack/react-query'
import {
	ClientOnly,
	HeadContent,
	Outlet,
	Scripts,
	createRootRouteWithContext,
} from '@tanstack/react-router'
import posthog from 'posthog-js'
import { useEffect } from 'react'

import { getLatestScrapeRun } from '@/lib/imdb/scrape-run'

import appCss from '../styles.css?url'

function Analytics() {
	useEffect(() => {
		const posthogKey = import.meta.env.VITE_PUBLIC_POSTHOG_KEY
		if (import.meta.env.MODE === 'development' || !posthogKey) return

		posthog.init(posthogKey, {
			api_host: '/api/ingest',
			ui_host: 'https://us.posthog.com',
			defaults: '2025-11-30',
			person_profiles: 'always',
		})
	}, [])

	return null
}

export const Route = createRootRouteWithContext<{
	queryClient: QueryClient
}>()({
	loader: async () => {
		return { latestScrapeRun: await getLatestScrapeRun() }
	},
	head: () => ({
		meta: [
			{
				charSet: 'utf-8',
			},
			{
				name: 'viewport',
				content: 'width=device-width, initial-scale=1',
			},
			{
				title: 'IMDB Graph',
			},
		],
		links: [{ rel: 'stylesheet', href: appCss }],
	}),
	component: RootComponent,
})

function RootComponent() {
	const { latestScrapeRun } = Route.useLoaderData()

	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body className="dark flex min-h-dvh min-w-80 flex-col font-sans">
				<div className="flex-1">
					<Outlet />
				</div>
				<DataLastUpdated completedAt={latestScrapeRun} />
				<ClientOnly fallback={null}>
					<Analytics />
				</ClientOnly>
				<Scripts />
			</body>
		</html>
	)
}

function DataLastUpdated({ completedAt }: { completedAt: string | null }) {
	const label = completedAt
		? `Data last updated on ${formatDataLastUpdated(completedAt)}`
		: 'Data has not been updated yet'

	return (
		<p className="text-muted-foreground/60 px-4 py-2 text-center text-xs">
			{label}
		</p>
	)
}

function formatDataLastUpdated(completedAt: string) {
	return new Intl.DateTimeFormat('en', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
		timeZone: 'UTC',
		timeZoneName: 'short',
	}).format(new Date(completedAt))
}
