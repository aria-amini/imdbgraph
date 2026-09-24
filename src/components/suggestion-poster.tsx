import { cn } from 'cn'
import { useState } from 'react'

import { getPosterImageUrl } from '@/lib/thumbnail/client'

/** Poster thumbnail with a lettered fallback while loading or on failure. */
export function SuggestionPoster({
	imdbId,
	title,
	className,
}: {
	imdbId: string
	title: string
	className?: string
}) {
	const [failed, setFailed] = useState(false)
	return (
		<span
			aria-hidden
			className={cn(
				'border-border bg-muted relative block h-12 w-8 shrink-0 overflow-hidden border',
				className,
			)}
		>
			<span className="text-muted-foreground absolute inset-0 flex items-center justify-center font-mono text-sm font-black">
				{title.charAt(0).toUpperCase()}
			</span>
			{!failed && (
				<img
					src={getPosterImageUrl(imdbId)}
					alt=""
					loading="lazy"
					onError={() => setFailed(true)}
					className="absolute inset-0 size-full object-cover"
				/>
			)}
		</span>
	)
}
