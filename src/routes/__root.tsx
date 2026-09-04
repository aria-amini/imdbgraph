import type { QueryClient } from '@tanstack/react-query'
import {
	ClientOnly,
	ErrorComponentProps,
	HeadContent,
	Outlet,
	Scripts,
	createRootRouteWithContext,
} from '@tanstack/react-router'
import posthog from 'posthog-js'
import { useEffect, type ReactNode } from 'react'

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
	errorComponent: RootErrorComponent,
	notFoundComponent: RootNotFoundComponent,
})

function DocumentShell({ children }: { children: ReactNode }) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body className="dark flex min-h-dvh min-w-80 flex-col font-sans">
				{children}
				<Scripts />
			</body>
		</html>
	)
}

function RootErrorComponent({ error }: ErrorComponentProps) {
	console.error(error)

	return (
		<DocumentShell>
			<main className="text-destructive flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
				<h1 className="text-2xl font-bold">Something went wrong</h1>
				<p className="text-muted-foreground text-sm">
					{import.meta.env.DEV && error instanceof Error
						? error.message
						: 'Unexpected error'}
				</p>
			</main>
		</DocumentShell>
	)
}

function RootNotFoundComponent() {
	return (
		<DocumentShell>
			<main className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
				<h1 className="text-2xl font-bold">Page not found</h1>
				<p className="text-muted-foreground text-sm">
					The page you are looking for does not exist.
				</p>
			</main>
		</DocumentShell>
	)
}

function RootComponent() {
	const { latestScrapeRun } = Route.useLoaderData()

	return (
		<DocumentShell>
			<div className="flex-1">
				<Outlet />
			</div>
			<DataLastUpdated completedAt={latestScrapeRun} />
			<ClientOnly fallback={null}>
				<Analytics />
			</ClientOnly>
		</DocumentShell>
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
