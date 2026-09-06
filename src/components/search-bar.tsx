import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link, useRouter } from '@tanstack/react-router'
import { Command } from 'cmdk'
import { cn } from 'cn'
import { Search as SearchIcon, Star, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
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

const NO_SUGGESTION_SELECTED = '__no_suggestion_selected__'

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
	const linkClickRef = useRef<'modified' | 'plain' | null>(null)
	const allowSuggestionSelectionRef = useRef(false)
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
		setSearch('')
		setSelectedSuggestion('')
		allowSuggestionSelectionRef.current = false
		containerRef.current?.querySelector<HTMLInputElement>('input')?.blur()
	}

	const selectShow = (showId: string) => {
		const linkClick = linkClickRef.current
		linkClickRef.current = null

		if (linkClick === 'modified') return

		setIsFocused(false)
		setIsMobileSearchActive(false)
		setSearch('')
		setSelectedSuggestion('')
		allowSuggestionSelectionRef.current = false
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
		setSearch('')
		setSelectedSuggestion('')
		allowSuggestionSelectionRef.current = false
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
						'max-md:fixed max-md:inset-0 max-md:z-50 max-md:m-0 max-md:max-w-none max-md:bg-background max-md:px-4 max-md:pt-[max(1rem,env(safe-area-inset-top))] max-md:pb-[max(1rem,env(safe-area-inset-bottom))]',
				)}
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
							</InputGroupAddon>
						</InputGroup>
						{isMobileSearchActive && (
							<Button
								type="button"
								variant="outline"
								size="icon"
								onClick={closeMobileSearch}
								className="hidden size-11 shrink-0 max-md:flex"
								aria-label="Close search"
							>
								<X aria-hidden />
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

					{isFocused && search && !error && searchResults && (
						<Command.List
							className={cn(
								'bg-popover z-50 w-full border p-2 shadow-md',
								isMobileSearchActive &&
									'max-md:static max-md:mt-3 max-md:max-h-full max-md:overflow-y-auto max-md:border-0 max-md:bg-card max-md:p-0 max-md:shadow-none',
								fullWidthDropdown && !isMobileSearchActive
									? 'fixed inset-x-4 top-[4.25rem] max-md:w-auto md:inset-x-0 md:top-14'
									: !isMobileSearchActive &&
											'absolute top-full right-0 left-0 mt-2',
							)}
						>
							{searchResults.length === 0 && !isFetching && (
								<div
									className={cn(
										'text-muted-foreground px-2 py-1.5 text-center',
									)}
								>
									No TV Shows Found.
								</div>
							)}
							{searchResults.map((show: Suggestion) => (
								<Command.Item
									key={show.imdbId}
									value={show.imdbId}
									asChild
									onSelect={() => selectShow(show.imdbId)}
									className={cn(
										'w-full cursor-pointer px-2 py-1.5 text-sm outline-none select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
										isMobileSearchActive &&
											'max-md:border-b max-md:px-3 max-md:py-2.5 last:max-md:border-b-0',
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
											<span
												className={cn(
													'text-muted-foreground group-aria-selected:text-accent-foreground text-xs',
													isMobileSearchActive && 'max-md:hidden',
												)}
											>
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
							{!isMobileSearchActive && (
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
