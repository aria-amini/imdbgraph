import { useQuery, type QueryClient } from '@tanstack/solid-query'
import {
	ClientOnly,
	ErrorComponentProps,
	HeadContent,
	Outlet,
	ScriptOnce,
	Scripts,
	createRootRouteWithContext,
} from '@tanstack/solid-router'
import posthog from 'posthog-js'
import { onMount, Show, Suspense, type JSX } from 'solid-js'
import { HydrationScript } from 'solid-js/web'

import { GithubLogoBold, LinkedinLogoBold } from '@/components/icons'
import { ThemeProvider, ThemeSwitch } from '@/components/theme-switch'
import {
	latestScrapeRunQuery,
	scrapeRunRefetchInterval,
	scrapeRunStaleTime,
} from '@/lib/imdb/scraper/scrape-run'
import { SITE_LINKS } from '@/lib/site'
import { createThemeBootstrapScript, getThemePreference } from '@/lib/theme'

import '../styles.css'

function Analytics() {
	onMount(() => {
		const posthogKey = import.meta.env.VITE_PUBLIC_POSTHOG_KEY

		if (import.meta.env.MODE === 'development' || !posthogKey) return

		posthog.init(posthogKey, {
			api_host: '/api/ingest',
			ui_host: 'https://us.posthog.com',
			defaults: '2025-11-30',
			person_profiles: 'always',
		})
	})

	return null
}

export const Route = createRootRouteWithContext<{
	queryClient: QueryClient
}>()({
	beforeLoad: () => ({ theme: getThemePreference() }),
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
	}),
	component: RootComponent,
	shellComponent: DocumentShell,
	errorComponent: RootErrorComponent,
	notFoundComponent: RootNotFoundComponent,
})

function DocumentShell(props: { children: JSX.Element }) {
	const theme = Route.useRouteContext({ select: (context) => context.theme })

	return (
		<html lang="en" class={theme() ?? undefined}>
			<head>
				<HydrationScript />
			</head>
			<body class="flex min-h-dvh min-w-80 flex-col font-sans">
				<HeadContent />
				<ScriptOnce>{createThemeBootstrapScript(theme() ?? null)}</ScriptOnce>
				<ThemeProvider preference={theme() ?? null}>
					<Suspense>{props.children}</Suspense>
				</ThemeProvider>
				<Scripts />
			</body>
		</html>
	)
}

function RootErrorComponent(props: ErrorComponentProps) {
	return (
		<main class="text-destructive flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
			<h1 class="text-2xl font-bold">Something went wrong</h1>
			<p class="text-muted-foreground text-sm">
				{import.meta.env.DEV && props.error instanceof Error
					? props.error.message
					: 'Unexpected error'}
			</p>
		</main>
	)
}

function RootNotFoundComponent() {
	return (
		<main class="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
			<h1 class="text-2xl font-bold">Page not found</h1>
			<p class="text-muted-foreground text-sm">
				The page you are looking for does not exist.
			</p>
		</main>
	)
}

function RootComponent() {
	const loaderData = Route.useLoaderData()

	const latestScrapeRun = useQuery(() => ({
		...latestScrapeRunQuery(scrapeRunStaleTime(loaderData().latestScrapeRun)),
		refetchInterval: (query) => scrapeRunRefetchInterval(query.state.data),
	}))

	return (
		<>
			<div class="flex-1">
				<Outlet />
			</div>
			<SiteFooter
				completedAt={latestScrapeRun.data ?? loaderData().latestScrapeRun}
			/>
			<ClientOnly fallback={null}>
				<Analytics />
			</ClientOnly>
		</>
	)
}

function SiteFooter(props: { completedAt: string | null }) {
	return (
		<footer class="text-muted-foreground border-t px-4 py-4 md:px-6">
			<div class="mx-auto flex max-w-4xl flex-wrap items-center gap-x-5 gap-y-2">
				<p class="text-xs">
					<Show
						when={props.completedAt}
						fallback="Data has not been updated yet"
					>
						{(completedAt) =>
							`Data last updated on ${formatDataLastUpdated(completedAt())}`
						}
					</Show>
				</p>
				<div class="flex flex-wrap items-center gap-4 sm:ml-auto">
					<a
						href={SITE_LINKS.github}
						target="_blank"
						rel="noreferrer"
						class="hover:text-foreground flex items-center gap-1.5 text-xs transition-colors"
					>
						<GithubLogoBold aria-hidden class="size-3.5" />
						GitHub
					</a>
					<a
						href={SITE_LINKS.linkedin}
						target="_blank"
						rel="noreferrer"
						class="hover:text-foreground flex items-center gap-1.5 text-xs transition-colors"
					>
						<LinkedinLogoBold aria-hidden class="size-3.5" />
						LinkedIn
					</a>
					<ThemeSwitch class="ml-1" />
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
