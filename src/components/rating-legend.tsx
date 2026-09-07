import { cn } from 'cn'

import { ratingColor } from '@/lib/imdb/rating-color'

const GRADIENT_STOP_RATINGS = [0, 6, 7, 8, 9, 10]
const TICK_RATINGS = [1, 5, 10]

const gradient = `linear-gradient(90deg, ${GRADIENT_STOP_RATINGS.map(
	(rating) => `${ratingColor(rating)} ${rating * 10}%`,
).join(', ')})`

export function RatingLegend({ className }: { className?: string }) {
	return (
		<div className={cn('flex items-start gap-2', className)}>
			<span className="sr-only">
				Episode rating color scale, red low through green high
			</span>
			<span
				aria-hidden
				className="text-muted-foreground pt-px font-mono text-[11px] leading-none tracking-widest uppercase"
			>
				Rating
			</span>
			<span aria-hidden className="flex flex-col gap-1">
				<span
					className="border-border h-2 w-24 border sm:w-32"
					style={{ backgroundImage: gradient }}
				/>
				<span className="text-muted-foreground relative block h-3 w-24 font-mono text-[11px] leading-none tabular-nums sm:w-32">
					{TICK_RATINGS.map((tick) => (
						<span
							className="absolute -translate-x-1/2"
							key={tick}
							style={{ left: `${tick * 10}%` }}
						>
							{tick}
						</span>
					))}
				</span>
			</span>
		</div>
	)
}
