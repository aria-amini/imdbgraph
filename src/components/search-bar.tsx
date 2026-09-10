import { MagnifyingGlass, Star } from '@phosphor-icons/react/dist/ssr'
import { useDebouncedValue } from '@tanstack/react-pacer'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link, useRouter } from '@tanstack/react-router'
import { Command } from 'cmdk'
import { cn } from 'cn'
import { useEffect, useRef, useState } from 'react'

import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import {
	fetchSuggestionsFromApi,
	type Suggestion,
} from '@/lib/imdb/suggestions'
import { formatYears } from '@/lib/imdb/types'

// Fast suggestion responses would flash the spinner on every keystroke.
const SPINNER_DELAY_MS = 300
const SEARCH_DEBOUNCE_MS = 200

/** Renders the title search input and its suggestion list. */
export function SearchBar({ className }: { className?: string }) {
	const [search, setSearch] = useState('')
	const [isHydrated, setIsHydrated] = useState(false)
	const [isFocused, setIsFocused] = useState(false)
	const [showSpinner, setShowSpinner] = useState(false)
	const [debouncedSearch, searchDebouncer] = useDebouncedValue(
		search,
		{ wait: SEARCH_DEBOUNCE_MS },
		(state) => ({ isPending: state.isPending }),
	)
	const containerRef = useRef<HTMLDivElement>(null)
	const linkClickRef = useRef<'modified' | 'plain' | null>(null)
	const router = useRouter()

	useEffect(() => {
		setIsHydrated(true)
	}, [])

	const handleBlur = () => {
		requestAnimationFrame(() => {
			if (
				containerRef.current &&
				!containerRef.current.contains(document.activeElement)
			) {
				setIsFocused(false)
			}
		})
	}

	const selectShow = (showId: string) => {
		const linkClick = linkClickRef.current
		linkClickRef.current = null

		if (linkClick === 'modified') return

		setIsFocused(false)
		setSearch('')
		// The state reset alone desyncs from the DOM: Safari keeps focus on the
		// input after a link click and cmdk never blurs after Enter, so the next
		// keystroke fires no focus event and the results stay closed until a
		// real blur. Blur here keeps focus state truthful.
		containerRef.current?.querySelector<HTMLInputElement>('input')?.blur()

		if (linkClick !== 'plain') {
			void router.navigate({
				to: '/ratings/$id',
				params: { id: showId },
			})
		}
	}

	const {
		isFetching,
		data: searchResults,
		error,
	} = useQuery({
		queryKey: ['suggestions', debouncedSearch],
		queryFn: () => fetchSuggestionsFromApi(debouncedSearch),
		enabled: isHydrated && Boolean(debouncedSearch),
		placeholderData: keepPreviousData,
	})
	const isSearching = searchDebouncer.state.isPending || isFetching

	useEffect(() => {
		if (!isFetching) {
			setShowSpinner(false)
			return
		}
		const timer = setTimeout(() => setShowSpinner(true), SPINNER_DELAY_MS)
		return () => clearTimeout(timer)
	}, [isFetching])

	return (
		<div
			ref={containerRef}
			className="relative h-full w-full"
			onFocus={() => setIsFocused(true)}
			onBlur={handleBlur}
		>
			<Command className={cn('flex flex-col', className)} shouldFilter={false}>
				<div className="relative">
					<InputGroup
						className={cn(
							'h-11 border-input bg-input/10 shadow-none transition-opacity md:h-8',
							{
								'cursor-progress opacity-70': !isHydrated,
							},
						)}
					>
						<InputGroupAddon className={cn({ 'opacity-60': !isHydrated })}>
							<MagnifyingGlass weight="bold" />
						</InputGroupAddon>
						<Command.Input
							value={search}
							onValueChange={setSearch}
							placeholder={
								isHydrated ? 'Search for any TV show...' : 'Loading search...'
							}
							className="h-full flex-1 py-0 placeholder:text-xs"
							disabled={!isHydrated}
							aria-label="Search TV shows"
							aria-busy={!isHydrated || isSearching}
							asChild={true}
						>
							<InputGroupInput />
						</Command.Input>

						<InputGroupAddon align="inline-end">
							{showSpinner && (
								<Spinner aria-hidden data-testid="loading-spinner" />
							)}
						</InputGroupAddon>
					</InputGroup>

					{error && (
						<div
							aria-live="polite"
							className="text-destructive px-2 py-1.5 text-center"
						>
							Something went wrong. Please try again.
						</div>
					)}

					{isFocused && search && !error && (isSearching || searchResults) && (
						<Command.List className="bg-popover absolute top-full right-0 left-0 z-50 mt-2 border p-2 shadow-md">
							{isSearching && (
								<Command.Loading
									label="Searching for TV shows"
									className="text-muted-foreground px-2 py-1.5 text-center"
								>
									Searching...
								</Command.Loading>
							)}
							{!isSearching && searchResults?.length === 0 && (
								<Command.Empty className="text-muted-foreground px-2 py-1.5 text-center">
									No TV Shows Found.
								</Command.Empty>
							)}
							{searchResults?.map((show: Suggestion) => (
								<Command.Item
									key={show.imdbId}
									value={show.imdbId}
									asChild
									onSelect={() => selectShow(show.imdbId)}
									className={cn(
										'w-full cursor-pointer px-2 py-1.5 text-sm outline-none select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
										{
											'opacity-50': isFetching,
										},
									)}
								>
									<Link
										to="/ratings/$id"
										params={{ id: show.imdbId }}
										onClickCapture={(event) => {
											linkClickRef.current =
												event.metaKey ||
												event.ctrlKey ||
												event.shiftKey ||
												event.altKey
													? 'modified'
													: 'plain'
										}}
										className="group aria-selected:bg-accent aria-selected:text-accent-foreground flex items-center gap-4"
									>
										<div className="flex flex-1 flex-col">
											<span className="wrap-break-word">
												{show.title}&nbsp;
											</span>
											<span className="text-muted-foreground group-aria-selected:text-accent-foreground text-xs">
												{formatYears(show)}
											</span>
										</div>
										<div className="text-muted-foreground group-aria-selected:text-accent-foreground flex items-center gap-1 text-sm">
											<span>{`${show.rating.toFixed(1)} / 10.0`}</span>
											<Star
												className="text-primary group-aria-selected:text-accent-foreground size-4"
												weight="bold"
											/>
										</div>
									</Link>
								</Command.Item>
							))}
						</Command.List>
					)}
				</div>
			</Command>
		</div>
	)
}
