import { createDebouncedValue } from '@tanstack/solid-pacer'
import { keepPreviousData, useQuery } from '@tanstack/solid-query'
import { Link, useHydrated, useRouter } from '@tanstack/solid-router'
import { cn } from 'cn'
import {
	createEffect,
	createSignal,
	For,
	onCleanup,
	Show,
	type JSX,
} from 'solid-js'

import {
	Command,
	CommandInput,
	CommandItem,
	CommandList,
	CommandLoading,
} from '@/components/command'
import {
	MagnifyingGlassBold,
	StarBold,
	XBold,
	XCircleBold,
} from '@/components/icons'
import { SuggestionPoster } from '@/components/suggestion-poster'
import { Button } from '@/components/ui/button'
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { createMobileOverlay } from '@/components/use-mobile-overlay'
import {
	fetchSuggestionsFromApi,
	MAX_SUGGESTIONS,
	type Suggestion,
} from '@/lib/imdb/search'
import { formatYears } from '@/lib/imdb/types'

// Fast suggestion responses would flash the spinner on every keystroke.
const SPINNER_DELAY_MS = 300

const SEARCH_DEBOUNCE_MS = 200

/** Renders the title search input and its suggestion list.
 *
 * - `navbar` pins a full-width dropdown under the shared navbar.
 * - `standalone` drops an inline dropdown and opens a fullscreen mobile
 *   overlay with a keyboard-docked search bar.
 */
export function SearchBar(props: {
	class?: string
	variant?: 'navbar' | 'standalone'
}) {
	const variant = () => props.variant ?? 'standalone'
	const [search, setSearch] = createSignal('')

	const [debouncedSearch, searchDebouncer] = createDebouncedValue(
		search,
		{ wait: SEARCH_DEBOUNCE_MS },
		(state) => ({ isPending: state.isPending }),
	)

	const [selectedSuggestion, setSelectedSuggestion] = createSignal('')
	const isHydrated = useHydrated()
	const [isFocused, setIsFocused] = createSignal(false)
	const [showSpinner, setShowSpinner] = createSignal(false)
	const [isMobileSearchActive, setIsMobileSearchActive] = createSignal(false)
	let containerRef: HTMLDivElement | undefined
	let inputRowRef: HTMLDivElement | undefined
	let linkClick: 'modified' | 'plain' | null = null
	const router = useRouter()

	const { viewport: overlayViewport, begin: beginOverlay } =
		createMobileOverlay(isMobileSearchActive, () => inputRowRef)

	const resetQueryState = () => {
		setSearch('')
		setSelectedSuggestion('')
	}

	// A click outside the search box dismisses the results; inside the mobile
	// dialog it also clears the query since the whole overlay acts as the
	// modal surface.
	createEffect(() => {
		if (!isFocused()) return

		const handlePointerDown = (event: PointerEvent) => {
			if (!containerRef) return

			const pointerInContainer =
				event.target instanceof Node && containerRef.contains(event.target)

			if (pointerInContainer) return
			setIsFocused(false)

			if (isMobileSearchActive()) {
				setIsMobileSearchActive(false)
				resetQueryState()
			}

			containerRef.querySelector<HTMLInputElement>('input')?.blur()
		}

		document.addEventListener('pointerdown', handlePointerDown)
		onCleanup(() =>
			document.removeEventListener('pointerdown', handlePointerDown),
		)
	})

	const handleFocusOut = () => {
		requestAnimationFrame(() => {
			if (containerRef && !containerRef.contains(document.activeElement)) {
				setIsFocused(false)
				setIsMobileSearchActive(false)
			}
		})
	}

	// The state reset alone desyncs from the DOM: Safari keeps focus on the
	// input after a link click and the combobox never blurs after Enter, so the
	// next keystroke fires no focus event and the results stay closed until a
	// real blur. Blur here keeps focus state truthful.
	const dismissSearch = () => {
		setIsFocused(false)
		setIsMobileSearchActive(false)
		resetQueryState()
		containerRef?.querySelector<HTMLInputElement>('input')?.blur()
	}

	const focusInput = () =>
		containerRef?.querySelector<HTMLInputElement>('input')?.focus()

	const clearSearch = () => {
		resetQueryState()
		focusInput()
	}

	// The retry button unmounts once the error clears. Moving focus first
	// keeps it inside the search box, so the results do not close.
	const retrySuggestions = () => {
		focusInput()
		void suggestionsQuery.refetch()
	}

	// Capture before the option's select handler so modifier clicks open the
	// link in a new tab without dismissing the open results.
	const captureLinkClick: JSX.EventHandler<HTMLAnchorElement, MouseEvent> = (
		event,
	) => {
		linkClick =
			event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
				? 'modified'
				: 'plain'
	}

	const dismissAndNavigate = (navigate: () => void) => {
		const captured = linkClick
		linkClick = null

		if (captured === 'modified') return

		dismissSearch()

		if (captured !== 'plain') {
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

	const openSearchPage = (query: string) =>
		void router.navigate({
			to: '/search',
			search: { q: query },
		})

	const suggestionsQuery = useQuery(() => ({
		queryKey: ['suggestions', debouncedSearch()],
		queryFn: () => fetchSuggestionsFromApi(debouncedSearch()),
		enabled: isHydrated() && Boolean(debouncedSearch()),
		placeholderData: keepPreviousData,
	}))

	// Solid Query suspends the nearest boundary when `data` is read before the
	// first response, which would blank the page behind the dropdown.
	const searchResults = () =>
		suggestionsQuery.isPending ? undefined : suggestionsQuery.data

	const isSearching = () =>
		searchDebouncer.state().isPending || suggestionsQuery.isFetching

	createEffect(() => {
		const fetching = suggestionsQuery.isFetching

		const timer = setTimeout(
			() => setShowSpinner(fetching),
			fetching ? SPINNER_DELAY_MS : 0,
		)

		onCleanup(() => clearTimeout(timer))
	})

	const suggestions = () =>
		search() ? (searchResults() ?? []).slice(0, MAX_SUGGESTIONS) : []

	const hasSuggestions = () => suggestions().length > 0

	// The highlight is reset to the first suggestion on every new result set,
	// including a refined set that keeps the previously highlighted show.
	createEffect(() => {
		searchResults()
		setSelectedSuggestion(suggestions()[0]?.imdbId ?? '')
	})

	return (
		<>
			<Show when={variant() === 'navbar' && isFocused() && search()}>
				<div
					aria-hidden="true"
					data-slot="search-backdrop"
					class="bg-background/60 animate-in fade-in fixed inset-x-0 top-17 bottom-0 z-40 backdrop-blur-sm duration-200 motion-reduce:animate-none md:top-14"
				/>
			</Show>
			<div
				ref={containerRef}
				class="relative h-full w-full"
				onFocusIn={() => {
					setIsFocused(true)

					if (
						variant() === 'standalone' &&
						window.matchMedia('(max-width: 767px)').matches
					) {
						beginOverlay(inputRowRef)
						setIsMobileSearchActive(true)
					}
				}}
				onFocusOut={handleFocusOut}
			>
				<Command
					class={cn(
						'flex w-full flex-col',
						props.class,
						isMobileSearchActive() &&
							'max-md:fixed max-md:inset-0 max-md:z-50 max-md:m-0 max-md:max-w-none max-md:bg-background max-md:px-4 max-md:search-safe-area max-md:top-(--overlay-top,0) max-md:h-(--overlay-height,auto) max-md:animate-in max-md:fade-in max-md:motion-reduce:animate-none max-md:duration-200',
					)}
					role={isMobileSearchActive() ? 'dialog' : undefined}
					aria-modal={isMobileSearchActive() || undefined}
					aria-label={isMobileSearchActive() ? 'Search TV shows' : undefined}
					onKeyDown={(event) => {
						if (event.key !== 'Escape') return
						event.stopPropagation()

						// Desktop keeps input focus so typing reopens the list; the
						// mobile overlay dismisses to the page, taking the keyboard
						// with it.
						if (isMobileSearchActive()) {
							dismissSearch()

							return
						}

						setIsFocused(false)
					}}
					onPointerDown={(event) => {
						if (!isMobileSearchActive()) return
						const target = event.target

						if (!(target instanceof Element)) return
						const inInputRow = inputRowRef?.contains(target) ?? false

						const inResults =
							target.closest('[data-slot="command-list"]') !== null

						const inError =
							target.closest('[data-slot="search-error"]') !== null

						if (inInputRow || inResults || inError) return
						dismissSearch()
					}}
					style={
						isMobileSearchActive() && overlayViewport()
							? {
									'--overlay-top': `${overlayViewport()?.top}px`,
									'--overlay-height': `${overlayViewport()?.height}px`,
								}
							: undefined
					}
					loop
					value={selectedSuggestion()}
					onValueChange={setSelectedSuggestion}
				>
					<div
						class={cn(
							'relative',
							isMobileSearchActive() &&
								'max-md:flex max-md:min-h-0 max-md:flex-1 max-md:flex-col',
						)}
					>
						<div ref={inputRowRef} class="flex">
							<InputGroup
								variant="search"
								pending={!isHydrated()}
								class="h-11 flex-1 md:h-8"
							>
								<InputGroupAddon>
									<MagnifyingGlassBold />
								</InputGroupAddon>
								<CommandInput
									as={InputGroupInput}
									value={search()}
									onInput={(event) => {
										const value = event.currentTarget.value
										setSearch(value)

										// Escape closes the list while the input keeps
										// focus; typing must bring it back.
										if (value) setIsFocused(true)
									}}
									placeholder={
										isHydrated()
											? 'Search for any TV show...'
											: 'Loading search...'
									}
									class="h-full flex-1 py-0 text-base placeholder:text-sm md:text-sm md:placeholder:text-xs"
									disabled={!isHydrated()}
									aria-label="Search TV shows"
									aria-busy={!isHydrated() || isSearching()}
								/>

								<InputGroupAddon align="inline-end">
									<Show when={showSpinner()}>
										<Spinner aria-hidden data-testid="loading-spinner" />
									</Show>
									<Show when={isHydrated() && search()}>
										<InputGroupButton
											size="icon-sm"
											onClick={clearSearch}
											aria-label="Clear search"
											tone="muted"
										>
											<XCircleBold aria-hidden class="size-4" />
										</InputGroupButton>
									</Show>
									<Show when={isMobileSearchActive() && !search()}>
										<InputGroupButton
											size="icon-sm"
											onClick={dismissSearch}
											aria-label="Close search"
											tone="muted"
										>
											<XBold aria-hidden class="size-4" />
										</InputGroupButton>
									</Show>
								</InputGroupAddon>
							</InputGroup>
						</div>

						<Show when={isFocused() && search() && suggestionsQuery.error}>
							<div
								data-slot="search-error"
								aria-live="polite"
								class="flex items-center justify-center gap-2 px-2 py-1.5"
							>
								<span class="text-destructive text-2xs font-mono tracking-widest uppercase">
									Couldn’t load suggestions
								</span>
								<Button
									type="button"
									variant="outline"
									size="xs"
									typography="label"
									onClick={retrySuggestions}
								>
									Retry
								</Button>
							</div>
						</Show>

						<Show when={isFocused() && !suggestionsQuery.error && search()}>
							<CommandList
								class={cn(
									'bg-popover z-50 border p-2 shadow-md',
									variant() === 'navbar'
										? 'fixed inset-x-4 top-17 mt-2 max-h-[calc(100dvh-6rem)] overflow-y-auto md:inset-x-0 md:top-14 md:mx-auto md:max-w-md md:max-h-[calc(100dvh-5rem)]'
										: 'absolute top-full right-0 left-0 mt-2 w-full',
									isMobileSearchActive() &&
										'max-md:static max-md:mt-3 max-md:max-h-full max-md:overflow-y-auto max-md:animate-in max-md:fade-in max-md:slide-in-from-top-1 max-md:motion-reduce:animate-none max-md:duration-200',
								)}
							>
								{/* The searching state replaces a stale empty list rather
									than stacking on visible suggestions. */}
								<Show when={isSearching() && !hasSuggestions()}>
									<CommandLoading
										label="Searching for TV shows"
										class="text-muted-foreground px-2 py-1.5 text-center"
									>
										Searching...
									</CommandLoading>
								</Show>
								<Show when={!hasSuggestions() && !isSearching()}>
									<div class="text-muted-foreground px-2 py-1.5 text-center">
										No TV Shows Found.
									</div>
								</Show>
								<For each={suggestions()}>
									{(show) => (
										<SuggestionItem
											show={show}
											onSelect={() => selectShow(show.imdbId)}
											onLinkClick={captureLinkClick}
										/>
									)}
								</For>
								<Show when={search().trim()}>
									{(query) => (
										<CommandItem
											value={`search-all:${query()}`}
											onSelect={() => {
												// Read before dismissing, which clears the query.
												const q = query()

												dismissAndNavigate(() => openSearchPage(q))
											}}
											class="group border-border aria-selected:bg-muted w-full cursor-pointer border-t text-sm outline-none select-none"
										>
											<Link
												to="/search"
												search={{ q: query() }}
												onClick={captureLinkClick}
												class="hover:bg-muted focus-visible:bg-muted block px-2 py-1.5 focus-visible:outline-none"
											>
												Search all results for “{query()}”
											</Link>
										</CommandItem>
									)}
								</Show>
							</CommandList>
						</Show>
					</div>
				</Command>
			</div>
		</>
	)
}

function SuggestionItem(props: {
	show: Suggestion
	onSelect: () => void
	onLinkClick: JSX.EventHandler<HTMLAnchorElement, MouseEvent>
}) {
	return (
		<CommandItem
			value={props.show.imdbId}
			onSelect={props.onSelect}
			class="group aria-selected:bg-accent aria-selected:text-accent-foreground w-full cursor-pointer text-sm outline-none select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
		>
			<Link
				to="/ratings/$id"
				params={{ id: props.show.imdbId }}
				onClick={props.onLinkClick}
				class="flex items-center gap-4 px-2 py-1.5"
			>
				<SuggestionPoster imdbId={props.show.imdbId} title={props.show.title} />
				<div class="flex flex-1 flex-col">
					<span class="wrap-break-word">{props.show.title}&nbsp;</span>
					<span class="text-muted-foreground group-aria-selected:text-accent-foreground text-xs">
						{formatYears(props.show)}
					</span>
				</div>
				<div class="text-muted-foreground group-aria-selected:text-accent-foreground flex items-center gap-1 text-sm">
					<span>{`${props.show.rating.toFixed(1)} / 10.0`}</span>
					<StarBold class="text-primary group-aria-selected:text-accent-foreground size-4" />
				</div>
			</Link>
		</CommandItem>
	)
}
