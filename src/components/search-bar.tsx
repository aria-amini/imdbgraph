import {
	MagnifyingGlass,
	Star,
	X,
	XCircle,
} from '@phosphor-icons/react/dist/ssr'
import { useDebouncedValue } from '@tanstack/react-pacer'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link, useHydrated, useRouter } from '@tanstack/react-router'
import { Command } from 'cmdk'
import { cn } from 'cn'
import { useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'

import { SuggestionPoster } from '@/components/suggestion-poster'
import { Button } from '@/components/ui/button'
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { useMobileOverlay } from '@/components/use-mobile-overlay'
import {
	fetchSuggestionsFromApi,
	MAX_SUGGESTIONS,
	type Suggestion,
} from '@/lib/imdb/search'
import { formatYears } from '@/lib/imdb/types'
import { useBrowserLayoutEffect } from '@/lib/use-browser-layout-effect'

// Fast suggestion responses would flash the spinner on every keystroke.
const SPINNER_DELAY_MS = 300
const SEARCH_DEBOUNCE_MS = 200

/** Renders the title search input and its suggestion list.
 *
 * - `navbar` pins a full-width dropdown under the shared navbar.
 * - `standalone` drops an inline dropdown and opens a fullscreen mobile
 *   overlay with a keyboard-docked search bar.
 */
export function SearchBar({
	className,
	variant = 'standalone',
}: {
	className?: string
	variant?: 'navbar' | 'standalone'
}) {
	const [search, setSearch] = useState('')
	const [debouncedSearch, searchDebouncer] = useDebouncedValue(
		search,
		{ wait: SEARCH_DEBOUNCE_MS },
		(state) => ({ isPending: state.isPending }),
	)
	const [selectedSuggestion, setSelectedSuggestion] = useState('')
	const isHydrated = useHydrated()
	const [isFocused, setIsFocused] = useState(false)
	const [showSpinner, setShowSpinner] = useState(false)
	const [isMobileSearchActive, setIsMobileSearchActive] = useState(false)
	const containerRef = useRef<HTMLDivElement>(null)
	const inputRowRef = useRef<HTMLDivElement>(null)
	const linkClickRef = useRef<'modified' | 'plain' | null>(null)
	const router = useRouter()
	const { viewport: overlayViewport, begin: beginOverlay } = useMobileOverlay(
		isMobileSearchActive,
		inputRowRef,
	)

	const resetQueryState = () => {
		setSearch('')
		setSelectedSuggestion('')
	}

	// A click outside the search box dismisses the results; inside the mobile
	// dialog it also clears the query since the whole overlay acts as the
	// modal surface.
	useEffect(() => {
		if (!isFocused) return
		const handlePointerDown = (event: PointerEvent) => {
			const container = containerRef.current
			if (!container) return
			const pointerInContainer =
				event.target instanceof Node && container.contains(event.target)
			if (pointerInContainer) return
			setIsFocused(false)
			if (isMobileSearchActive) {
				setIsMobileSearchActive(false)
				resetQueryState()
			}
			container.querySelector<HTMLInputElement>('input')?.blur()
		}
		document.addEventListener('pointerdown', handlePointerDown)
		return () => document.removeEventListener('pointerdown', handlePointerDown)
	}, [isFocused, isMobileSearchActive])

	const handleBlur = () => {
		requestAnimationFrame(() => {
			if (
				containerRef.current &&
				!containerRef.current.contains(document.activeElement)
			) {
				setIsFocused(false)
				setIsMobileSearchActive(false)
			}
		})
	}

	// The state reset alone desyncs from the DOM: Safari keeps focus on the
	// input after a link click and cmdk never blurs after Enter, so the next
	// keystroke fires no focus event and the results stay closed until a
	// real blur. Blur here keeps focus state truthful.
	const dismissSearch = () => {
		setIsFocused(false)
		setIsMobileSearchActive(false)
		resetQueryState()
		containerRef.current?.querySelector<HTMLInputElement>('input')?.blur()
	}

	const clearSearch = () => {
		resetQueryState()
		containerRef.current?.querySelector<HTMLInputElement>('input')?.focus()
	}

	// Capture before router navigation so modifier clicks open the link in a
	// new tab without dismissing the open results.
	const captureLinkClick = (event: MouseEvent<HTMLAnchorElement>) => {
		linkClickRef.current =
			event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
				? 'modified'
				: 'plain'
	}

	const dismissAndNavigate = (navigate: () => void) => {
		const linkClick = linkClickRef.current
		linkClickRef.current = null

		if (linkClick === 'modified') return

		dismissSearch()

		if (linkClick !== 'plain') {
			navigate()
		}
	}

	const selectShow = (showId: string) =>
		dismissAndNavigate(
			() =>
				void router.navigate({
					to: '/ratings/$id',
					params: { id: showId },
				}),
		)

	const openSearchPage = () => {
		const query = search.trim()
		if (!query) return

		void router.navigate({
			to: '/search',
			search: { q: query },
		})
	}

	const {
		isFetching,
		data: searchResults,
		error,
		refetch,
	} = useQuery({
		queryKey: ['suggestions', debouncedSearch],
		queryFn: () => fetchSuggestionsFromApi(debouncedSearch),
		enabled: isHydrated && Boolean(debouncedSearch),
		placeholderData: keepPreviousData,
	})
	const isSearching = searchDebouncer.state.isPending || isFetching

	useEffect(() => {
		// The off edge hides on the next tick instead of synchronously; the
		// compiler rejects setState during the effect body.
		const timer = setTimeout(
			() => setShowSpinner(isFetching),
			isFetching ? SPINNER_DELAY_MS : 0,
		)
		return () => clearTimeout(timer)
	}, [isFetching])

	const suggestions = search
		? (searchResults ?? []).slice(0, MAX_SUGGESTIONS)
		: []
	const hasSuggestions = suggestions.length > 0
	const firstSuggestionId = suggestions[0]?.imdbId

	// cmdk keeps whichever id survives into a swapped-in result set, so the
	// highlight is reset to the first suggestion on every new result set.
	// Layout timing keeps the highlight present in the first painted frame.
	useBrowserLayoutEffect(() => {
		setSelectedSuggestion(firstSuggestionId ?? '')
	}, [firstSuggestionId, searchResults])

	return (
		<>
			{variant === 'navbar' && isFocused && search && (
				<div
					aria-hidden="true"
					data-slot="search-backdrop"
					className="bg-background/60 animate-in fade-in fixed inset-x-0 top-17 bottom-0 z-40 backdrop-blur-sm duration-200 motion-reduce:animate-none md:top-14"
				/>
			)}
			<div
				ref={containerRef}
				className="relative h-full w-full"
				onFocus={() => {
					setIsFocused(true)
					if (
						variant === 'standalone' &&
						window.matchMedia('(max-width: 767px)').matches
					) {
						beginOverlay(inputRowRef.current)
						setIsMobileSearchActive(true)
					}
				}}
				onBlur={handleBlur}
			>
				<Command
					className={cn(
						'flex w-full flex-col',
						className,
						isMobileSearchActive &&
							'max-md:fixed max-md:inset-0 max-md:z-50 max-md:m-0 max-md:max-w-none max-md:bg-background max-md:px-4 max-md:search-safe-area max-md:top-(--overlay-top,0) max-md:h-(--overlay-height,auto) max-md:animate-in max-md:fade-in max-md:motion-reduce:animate-none max-md:duration-200',
					)}
					role={isMobileSearchActive ? 'dialog' : undefined}
					aria-modal={isMobileSearchActive || undefined}
					aria-label={isMobileSearchActive ? 'Search TV shows' : undefined}
					onKeyDown={(event) => {
						if (event.key !== 'Escape') return
						event.stopPropagation()
						// Desktop keeps input focus so typing reopens the list; the
						// mobile overlay dismisses to the page, taking the keyboard
						// with it.
						if (isMobileSearchActive) {
							dismissSearch()
							return
						}
						setIsFocused(false)
					}}
					onPointerDown={(event) => {
						if (!isMobileSearchActive) return
						const target = event.target
						if (!(target instanceof Element)) return
						const inInputRow = inputRowRef.current?.contains(target) ?? false
						const inResults = target.closest('[cmdk-list]') !== null
						const inError =
							target.closest('[data-slot="search-error"]') !== null
						if (inInputRow || inResults || inError) return
						dismissSearch()
					}}
					style={
						isMobileSearchActive && overlayViewport
							? {
									'--overlay-top': `${overlayViewport.top}px`,
									'--overlay-height': `${overlayViewport.height}px`,
								}
							: undefined
					}
					shouldFilter={false}
					loop
					value={selectedSuggestion}
					onValueChange={setSelectedSuggestion}
				>
					<div
						className={cn(
							'relative',
							isMobileSearchActive &&
								'max-md:flex max-md:min-h-0 max-md:flex-1 max-md:flex-col',
						)}
					>
						<div ref={inputRowRef} className="flex">
							<InputGroup
								className={cn(
									'h-11 flex-1 border-input bg-input/10 shadow-none transition-opacity md:h-8',
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
									onValueChange={(value) => {
										setSearch(value)
										// Escape closes the list while the input keeps
										// focus; typing must bring it back.
										if (value) setIsFocused(true)
									}}
									placeholder={
										isHydrated
											? 'Search for any TV show...'
											: 'Loading search...'
									}
									className="h-full flex-1 py-0 text-base placeholder:text-sm md:text-sm md:placeholder:text-xs"
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
									{isHydrated && search && (
										<InputGroupButton
											size="icon-sm"
											onClick={clearSearch}
											aria-label="Clear search"
											className="text-muted-foreground hover:text-foreground"
										>
											<XCircle aria-hidden className="size-4" weight="bold" />
										</InputGroupButton>
									)}
									{isMobileSearchActive && !search && (
										<InputGroupButton
											size="icon-sm"
											onClick={dismissSearch}
											aria-label="Close search"
											className="text-muted-foreground hover:text-foreground"
										>
											<X aria-hidden className="size-4" weight="bold" />
										</InputGroupButton>
									)}
								</InputGroupAddon>
							</InputGroup>
						</div>

						{isFocused && search && error && (
							<div
								data-slot="search-error"
								aria-live="polite"
								className="flex items-center justify-center gap-2 px-2 py-1.5"
							>
								<span className="text-destructive text-2xs font-mono tracking-widest uppercase">
									Couldn’t load suggestions
								</span>
								<Button
									type="button"
									variant="outline"
									size="xs"
									className="text-2xs font-mono tracking-widest uppercase"
									onClick={() => void refetch()}
								>
									Retry
								</Button>
							</div>
						)}

						{isFocused && !error && search && (
							<Command.List
								className={cn(
									'bg-popover z-50 border p-2 shadow-md',
									variant === 'navbar'
										? 'fixed inset-x-4 top-17 mt-2 max-h-[calc(100dvh-6rem)] overflow-y-auto md:inset-x-0 md:top-14 md:mx-auto md:max-w-md md:max-h-[calc(100dvh-5rem)]'
										: 'absolute top-full right-0 left-0 mt-2 w-full',
									isMobileSearchActive &&
										'max-md:static max-md:mt-3 max-md:max-h-full max-md:overflow-y-auto max-md:animate-in max-md:fade-in max-md:slide-in-from-top-1 max-md:motion-reduce:animate-none max-md:duration-200',
								)}
							>
								{/* The searching state replaces a stale empty list rather
									than stacking on visible suggestions. */}
								{isSearching && !hasSuggestions && (
									<Command.Loading
										label="Searching for TV shows"
										className="text-muted-foreground px-2 py-1.5 text-center"
									>
										Searching...
									</Command.Loading>
								)}
								{!hasSuggestions && !isSearching && (
									<div className="text-muted-foreground px-2 py-1.5 text-center">
										No TV Shows Found.
									</div>
								)}
								{suggestions.map((show: Suggestion) => (
									<Command.Item
										key={show.imdbId}
										value={show.imdbId}
										asChild
										onSelect={() => selectShow(show.imdbId)}
										className={cn(
											'w-full cursor-pointer px-2 py-1.5 text-sm outline-none select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
										)}
									>
										<Link
											to="/ratings/$id"
											params={{ id: show.imdbId }}
											onClickCapture={captureLinkClick}
											className="group aria-selected:bg-accent aria-selected:text-accent-foreground flex items-center gap-4"
										>
											<SuggestionPoster
												imdbId={show.imdbId}
												title={show.title}
											/>
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
								{search.trim() && (
									<Command.Item
										value={`search-all:${search.trim()}`}
										asChild
										onSelect={() => dismissAndNavigate(openSearchPage)}
										className="border-border w-full cursor-pointer border-t text-sm outline-none select-none"
									>
										<Link
											to="/search"
											search={{ q: search.trim() }}
											onClickCapture={captureLinkClick}
											className="group hover:bg-muted focus-visible:bg-muted aria-selected:bg-muted block px-2 py-1.5 focus-visible:outline-none"
										>
											Search all results for “{search.trim()}”
										</Link>
									</Command.Item>
								)}
							</Command.List>
						)}
					</div>
				</Command>
			</div>
		</>
	)
}
