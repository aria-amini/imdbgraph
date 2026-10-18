import { cn } from 'cn'
import { createSignal, Show } from 'solid-js'

import { getPosterImageUrl } from '@/lib/thumbnail/client'

/** Poster thumbnail with a lettered fallback while loading or on failure. */
export function SuggestionPoster(props: {
	imdbId: string
	title: string
	class?: string
}) {
	const [failed, setFailed] = createSignal(false)

	return (
		<span
			aria-hidden
			class={cn(
				'border-border bg-muted relative block h-12 w-8 shrink-0 overflow-hidden border',
				props.class,
			)}
		>
			<span class="text-muted-foreground absolute inset-0 flex items-center justify-center font-mono text-sm font-black">
				{props.title.charAt(0).toUpperCase()}
			</span>
			<Show when={!failed()}>
				<img
					src={getPosterImageUrl(props.imdbId)}
					alt=""
					loading="lazy"
					onError={() => setFailed(true)}
					class="absolute inset-0 size-full object-cover"
				/>
			</Show>
		</span>
	)
}
