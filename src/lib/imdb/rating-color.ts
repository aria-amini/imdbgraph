/**
 * Maps an IMDb rating onto the hue scale used across the ratings visualizations
 * (red near 0 through green near 10).
 */
export function ratingColor(rating: number): string {
	const stops = [
		{ rating: 0, hue: 0 },
		{ rating: 6, hue: 8 },
		{ rating: 7, hue: 42 },
		{ rating: 8, hue: 82 },
		{ rating: 9, hue: 112 },
		{ rating: 10, hue: 132 },
	]
	const clampedRating = Math.max(0, Math.min(10, rating))
	const upperStop =
		stops.find((stop) => stop.rating >= clampedRating) ?? stops.at(-1)!
	const lowerStop = stops[stops.indexOf(upperStop) - 1] ?? upperStop
	const progress =
		(clampedRating - lowerStop.rating) /
		(upperStop.rating - lowerStop.rating || 1)
	const hue = Math.round(
		lowerStop.hue + (upperStop.hue - lowerStop.hue) * progress,
	)
	return `hsl(${hue} 72% 46%)`
}
