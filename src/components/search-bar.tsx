import {
	fetchSuggestionsFromApi,
	type Suggestion,
} from '@/lib/imdb/suggestions'
import { formatYears } from '@/lib/imdb/types'
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link, useRouter } from '@tanstack/react-router'
import { Command } from 'cmdk'
import { Search as SearchIcon, Star } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

/** https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-autocomplete-list/ */
export function SearchBar({ className }: { className?: string }) {
	const [search, setSearch] = useState('')
	const [isHydrated, setIsHydrated] = useState(false)
	const [isFocused, setIsFocused] = useState(false)
	const containerRef = useRef<HTMLDivElement>(null)
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
			onFocus={() => setIsFocused(true)}
			onBlur={handleBlur}
		>
			<Command className={cn('flex flex-col', className)} shouldFilter={false}>
				<div className="relative">
					<InputGroup
						className={cn('border-input bg-input/10 transition-opacity', {
							'cursor-progress opacity-70': !isHydrated,
						})}
					>
						<InputGroupAddon className={cn({ 'opacity-60': !isHydrated })}>
							<SearchIcon />
						</InputGroupAddon>
						<Command.Input
							value={search}
							onValueChange={setSearch}
							placeholder={
								isHydrated ? 'Search for any TV show...' : 'Loading search...'
							}
							className="h-full flex-1 py-0 text-sm placeholder:text-xs"
							disabled={!isHydrated}
							aria-busy={!isHydrated}
							asChild={true}
						>
							<InputGroupInput />
						</Command.Input>

						<InputGroupAddon align="inline-end">
							{isFetching && <Spinner data-testid="loading-spinner" />}
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

					{isFocused && search && !error && searchResults && (
						<Command.List className="bg-popover absolute top-full right-0 left-0 z-50 mt-2 border p-2 shadow-md">
							{searchResults.length === 0 && !isFetching && (
								<Command.Empty className="text-muted-foreground px-2 py-1.5 text-center">
									No TV Shows Found.
								</Command.Empty>
							)}
							{searchResults.map((show: Suggestion) => (
								<Command.Item
									key={show.imdbId}
									value={show.imdbId}
									asChild
									onSelect={() => {
										void router.navigate({
											to: '/ratings/$id',
											params: { id: show.imdbId },
										})
									}}
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
						</Command.List>
					)}
				</div>
			</Command>
		</div>
	)
}
