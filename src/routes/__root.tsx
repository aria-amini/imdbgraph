import { GithubLogo, LinkedinLogo } from '@phosphor-icons/react/dist/ssr'
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

import { ThemeToggle } from '@/components/theme-toggle'
import {
	latestScrapeRunQuery,
	scrapeRunStaleTime,
} from '@/lib/imdb/scrape-run-query'
import { SITE_LINKS } from '@/lib/site'
import { themeInitScript } from '@/lib/theme'

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
	loader: async ({ context: { queryClient } }) => {
		const { queryKey } = latestScrapeRunQuery(0)
		return {
			latestScrapeRun: await queryClient.fetchQuery(
				latestScrapeRunQuery(
					scrapeRunStaleTime(queryClient.getQueryData<string>(queryKey)),
				),
			),
		}
	},
	head: () => ({
		meta: [
			{
				charSet: 'utf-8',
			},
			{
				name: 'viewport',
				content: 'width=device-width, initial-scale=1, viewport-fit=cover',
			},
			{
				title: 'IMDB Graph',
			},
		],
		links: [{ rel: 'stylesheet', href: appCss }],
	}),
	component: RootComponent,
	shellComponent: DocumentShell,
	errorComponent: RootErrorComponent,
	notFoundComponent: RootNotFoundComponent,
})

function DocumentShell({ children }: { children: ReactNode }) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
				<script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
			</head>
			<body className="flex min-h-dvh min-w-80 flex-col font-sans">
				{children}
				<Scripts />
			</body>
		</html>
	)
}

function RootErrorComponent({ error }: ErrorComponentProps) {
	return (
		<main className="text-destructive flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
			<h1 className="text-2xl font-bold">Something went wrong</h1>
			<p className="text-muted-foreground text-sm">
				{import.meta.env.DEV && error instanceof Error
					? error.message
					: 'Unexpected error'}
			</p>
		</main>
	)
}

function RootNotFoundComponent() {
	return (
		<main className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
			<h1 className="text-2xl font-bold">Page not found</h1>
			<p className="text-muted-foreground text-sm">
				The page you are looking for does not exist.
			</p>
		</main>
	)
}

function RootComponent() {
	const { latestScrapeRun } = Route.useLoaderData()

	return (
		<>
			<div className="flex-1">
				<Outlet />
			</div>
			<SiteFooter completedAt={latestScrapeRun} />
			<ClientOnly fallback={null}>
				<Analytics />
			</ClientOnly>
		</>
	)
}

function SiteFooter({ completedAt }: { completedAt: string | null }) {
	const label = completedAt
		? `Data last updated on ${formatDataLastUpdated(completedAt)}`
		: 'Data has not been updated yet'

	return (
		<footer className="text-muted-foreground border-t px-4 py-4 md:px-6">
			<div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-5 gap-y-2">
				<p className="text-xs">{label}</p>
				<div className="flex flex-wrap items-center gap-4 sm:ml-auto">
					<a
						href={SITE_LINKS.github}
						target="_blank"
						rel="noreferrer"
						className="hover:text-foreground flex items-center gap-1.5 text-xs transition-colors"
					>
						<GithubLogo aria-hidden className="size-3.5" weight="bold" />
						GitHub
					</a>
					<a
						href={SITE_LINKS.linkedin}
						target="_blank"
						rel="noreferrer"
						className="hover:text-foreground flex items-center gap-1.5 text-xs transition-colors"
					>
						<LinkedinLogo aria-hidden className="size-3.5" weight="bold" />
						LinkedIn
					</a>
					<ThemeToggle className="ml-1" />
				</div>
			</div>
		</footer>
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
