import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link, useRouter } from '@tanstack/react-router'
import { Command } from 'cmdk'
import { cn } from 'cn'
import { CircleX, Search as SearchIcon, Star, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import {
	fetchSuggestionsFromApi,
	type Suggestion,
} from '@/lib/imdb/suggestions'
import { formatYears } from '@/lib/imdb/types'

const NO_SUGGESTION_SELECTED = '__no_suggestion_selected__'

// Placeholder until a real top-rated query backs it.
const DEFAULT_SUGGESTIONS: Suggestion[] = [
	{
		imdbId: 'tt7366338',
		title: 'Chernobyl',
		startYear: '2019',
		endYear: '2019',
		rating: 9.6,
		numVotes: 1_400_000,
	},
	{
		imdbId: 'tt0903747',
		title: 'Breaking Bad',
		startYear: '2008',
		endYear: '2013',
		rating: 9.5,
		numVotes: 2_400_000,
	},
	{
		imdbId: 'tt0185906',
		title: 'Band of Brothers',
		startYear: '2001',
		endYear: '2001',
		rating: 9.4,
		numVotes: 750_000,
	},
	{
		imdbId: 'tt0944947',
		title: 'Game of Thrones',
		startYear: '2011',
		endYear: '2019',
		rating: 9.2,
		numVotes: 2_300_000,
	},
	{
		imdbId: 'tt0141842',
		title: 'The Sopranos',
		startYear: '1999',
		endYear: '2007',
		rating: 9.2,
		numVotes: 1_200_000,
	},
]

/** Renders the title search input and its suggestion list. */
export function SearchBar({
	className,
	fullWidthDropdown = false,
	mobileSearchOverlay = false,
}: {
	className?: string
	fullWidthDropdown?: boolean
	mobileSearchOverlay?: boolean
}) {
	const [search, setSearch] = useState('')
	const [selectedSuggestion, setSelectedSuggestion] = useState('')
	const [isHydrated, setIsHydrated] = useState(false)
	const [isFocused, setIsFocused] = useState(false)
	const [isMobileSearchActive, setIsMobileSearchActive] = useState(false)
	const hasNavigatedSuggestionsRef = useRef(false)
	const containerRef = useRef<HTMLDivElement>(null)
	const sheetRef = useRef<HTMLDivElement>(null)
	const linkClickRef = useRef<'modified' | 'plain' | null>(null)
	const allowSuggestionSelectionRef = useRef(false)
	const router = useRouter()

	useEffect(() => {
		setIsHydrated(true)
	}, [])

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

	const [overlayViewport, setOverlayViewport] = useState<{
		top: number
		height: number
	} | null>(null)

	// iOS Safari scrolls the visual viewport when the keyboard opens, which
	// pushes fixed top:0 content behind the browser chrome; the overlay tracks
	// visualViewport so it stays aligned with the visible area.
	useEffect(() => {
		if (!isMobileSearchActive) return
		const viewport = window.visualViewport
		if (!viewport) return
		const sync = () =>
			setOverlayViewport({ top: viewport.offsetTop, height: viewport.height })
		sync()
		// Safari can skip the final resize event while the keyboard animates.
		const timers = [300, 700].map((ms) => setTimeout(sync, ms))
		viewport.addEventListener('resize', sync)
		viewport.addEventListener('scroll', sync)
		return () => {
			timers.forEach(clearTimeout)
			viewport.removeEventListener('resize', sync)
			viewport.removeEventListener('scroll', sync)
		}
	}, [isMobileSearchActive])

	const closeMobileSearch = () => {
		setIsFocused(false)
		setIsMobileSearchActive(false)
		resetQueryState()
		containerRef.current?.querySelector<HTMLInputElement>('input')?.blur()
	}

	const resetQueryState = () => {
		setSearch('')
		setSelectedSuggestion('')
		allowSuggestionSelectionRef.current = false
	}

	const clearSearch = () => {
		resetQueryState()
		hasNavigatedSuggestionsRef.current = false
		containerRef.current?.querySelector<HTMLInputElement>('input')?.focus()
	}

	const selectShow = (showId: string) => {
		const linkClick = linkClickRef.current
		linkClickRef.current = null

		if (linkClick === 'modified') return

		setIsFocused(false)
		setIsMobileSearchActive(false)
		resetQueryState()
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

	const openSearchPage = () => {
		const query = search.trim()
		if (!query) return

		setIsFocused(false)
		setIsMobileSearchActive(false)
		resetQueryState()
		containerRef.current?.querySelector<HTMLInputElement>('input')?.blur()
		void router.navigate({
			to: '/search/$query',
			params: { query },
		})
	}

	const {
		isFetching,
		data: searchResults,
		error,
	} = useQuery({
		queryKey: ['suggestions', search],
		queryFn: () => fetchSuggestionsFromApi(search),
		enabled: isHydrated && Boolean(search),
		placeholderData: keepPreviousData,
	})

	const suggestions = search ? searchResults : DEFAULT_SUGGESTIONS

	return (
		<div
			ref={containerRef}
			className="relative h-full w-full"
			onFocus={() => {
				setIsFocused(true)
				if (
					mobileSearchOverlay &&
					window.matchMedia('(max-width: 767px)').matches
				) {
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
						'max-md:fixed max-md:inset-0 max-md:z-50 max-md:m-0 max-md:max-w-none max-md:bg-background max-md:px-4 max-md:pt-[max(1rem,env(safe-area-inset-top))] max-md:pb-[max(1rem,env(safe-area-inset-bottom))] max-md:animate-in max-md:fade-in max-md:duration-200',
				)}
				onPointerDown={(event) => {
					const sheet = sheetRef.current
					if (
						isMobileSearchActive &&
						sheet &&
						!(event.target instanceof Node && sheet.contains(event.target))
					) {
						closeMobileSearch()
					}
				}}
				style={
					isMobileSearchActive && overlayViewport
						? { top: overlayViewport.top, height: overlayViewport.height }
						: undefined
				}
				shouldFilter={false}
				value={selectedSuggestion || `${NO_SUGGESTION_SELECTED}:${search}`}
				onValueChange={(value) => {
					if (allowSuggestionSelectionRef.current) {
						setSelectedSuggestion(value)
						return
					}
					setSelectedSuggestion(`${NO_SUGGESTION_SELECTED}:${value}`)
				}}
			>
				<div
					ref={sheetRef}
					className={cn(
						'relative',
						isMobileSearchActive &&
							'max-md:flex max-md:min-h-0 max-md:flex-1 max-md:flex-col',
					)}
				>
					<div className={cn('flex', isMobileSearchActive && 'max-md:gap-3')}>
						<InputGroup
							className={cn(
								'h-11 flex-1 border-input bg-input/10 shadow-none transition-opacity md:h-8',
								{
									'cursor-progress opacity-70': !isHydrated,
								},
							)}
						>
							<InputGroupAddon className={cn({ 'opacity-60': !isHydrated })}>
								<SearchIcon />
							</InputGroupAddon>
							<Command.Input
								value={search}
								onValueChange={(value) => {
									allowSuggestionSelectionRef.current = false
									setSelectedSuggestion('')
									hasNavigatedSuggestionsRef.current = false
									setSearch(value)
								}}
								onKeyDown={(event) => {
									if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
										allowSuggestionSelectionRef.current = true
										hasNavigatedSuggestionsRef.current = true
									}
									if (
										event.key === 'Enter' &&
										!hasNavigatedSuggestionsRef.current
									) {
										event.preventDefault()
										openSearchPage()
									}
								}}
								placeholder={
									isHydrated ? 'Search for any TV show...' : 'Loading search...'
								}
								className="h-full flex-1 py-0 text-base placeholder:text-sm md:text-sm md:placeholder:text-xs"
								disabled={!isHydrated}
								aria-label="Search TV shows"
								aria-busy={!isHydrated || isFetching}
								asChild={true}
							>
								<InputGroupInput />
							</Command.Input>

							<InputGroupAddon align="inline-end">
								{isFetching && (
									<Spinner aria-hidden data-testid="loading-spinner" />
								)}
								{isHydrated && search && (
									<InputGroupButton
										size="icon-sm"
										onClick={clearSearch}
										aria-label="Clear search"
										className="text-muted-foreground hover:text-foreground"
									>
										<CircleX className="size-4" aria-hidden />
									</InputGroupButton>
								)}
							</InputGroupAddon>
						</InputGroup>
						{isMobileSearchActive && (
							<Button
								type="button"
								variant="ghost"
								size="icon"
								onClick={closeMobileSearch}
								className="hidden size-11 shrink-0 max-md:flex"
								aria-label="Close search"
							>
								<X className="size-5" aria-hidden />
							</Button>
						)}
					</div>

					{error && (
						<div
							aria-live="polite"
							className="text-destructive px-2 py-1.5 text-center"
						>
							Something went wrong. Please try again.
						</div>
					)}

					{isFocused && !error && suggestions && (
						<Command.List
							className={cn(
								'bg-popover z-50 w-full border p-2 shadow-md',
								fullWidthDropdown
									? 'max-md:absolute max-md:top-full max-md:right-0 max-md:left-0 max-md:mt-2 md:fixed md:inset-x-0 md:top-14'
									: 'absolute top-full right-0 left-0 mt-2',
								isMobileSearchActive &&
									'max-md:static max-md:mt-3 max-md:max-h-full max-md:overflow-y-auto max-md:animate-in max-md:fade-in max-md:slide-in-from-top-1 max-md:duration-200',
							)}
						>
							{search && suggestions.length === 0 && !isFetching && (
								<div
									className={cn(
										'text-muted-foreground px-2 py-1.5 text-center',
									)}
								>
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
											<Star className="text-primary group-aria-selected:text-accent-foreground size-4" />
										</div>
									</Link>
								</Command.Item>
							))}
							{search && (
								<Link
									to="/search/$query"
									params={{ query: search.trim() }}
									className={cn(
										'block border-t border-border px-2 py-1.5 text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none',
									)}
								>
									Search all results for “{search.trim()}”
								</Link>
							)}
						</Command.List>
					)}
				</div>
			</Command>
		</div>
	)
}
