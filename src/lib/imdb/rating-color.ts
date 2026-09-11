const STOPS = [
	{ rating: 0, hue: 0 },
	{ rating: 6, hue: 8 },
	{ rating: 7, hue: 42 },
	{ rating: 8, hue: 82 },
	{ rating: 9, hue: 112 },
	{ rating: 10, hue: 132 },
]

const CELL_SATURATION = 0.72
const CELL_LIGHTNESS = 0.46

/**
 * Maps an IMDb rating onto the hue scale used across the ratings visualizations
 * (red near 0 through green near 10).
 */
export function ratingHue(rating: number): number {
	const clampedRating = Math.max(0, Math.min(10, rating))
	const upperStop =
		STOPS.find((stop) => stop.rating >= clampedRating) ?? STOPS.at(-1)!
	const lowerStop = STOPS[STOPS.indexOf(upperStop) - 1] ?? upperStop
	const progress =
		(clampedRating - lowerStop.rating) /
		(upperStop.rating - lowerStop.rating || 1)
	return Math.round(lowerStop.hue + (upperStop.hue - lowerStop.hue) * progress)
}

export function ratingColor(rating: number): string {
	return `hsl(${ratingHue(rating)} ${CELL_SATURATION * 100}% ${CELL_LIGHTNESS * 100}%)`
}

function cellLuminance(hue: number): number {
	const c = (1 - Math.abs(2 * CELL_LIGHTNESS - 1)) * CELL_SATURATION
	const hueSegment = (hue % 360) / 60
	const x = c * (1 - Math.abs((hueSegment % 2) - 1))
	const [r, g, b] =
		hueSegment < 1
			? [c, x, 0]
			: hueSegment < 2
				? [x, c, 0]
				: hueSegment < 3
					? [0, c, x]
					: hueSegment < 4
						? [0, x, c]
						: hueSegment < 5
							? [x, 0, c]
							: [c, 0, x]
	const m = CELL_LIGHTNESS - c / 2
	const gamma = (v: number) =>
		v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
	return 0.2126 * gamma(r + m) + 0.7152 * gamma(g + m) + 0.0722 * gamma(b + m)
}

// Cell surfaces are theme-independent, so the ink is fixed too: matches the
// light-theme --foreground. White numerals only survive 4.5:1 on the dark red
// end of the scale; everything lighter takes dark ink.
const DARK_INK = 'oklch(0.2393 0 0)'

export function ratingTextColor(rating: number): string {
	const contrastWithWhite = 1.05 / (cellLuminance(ratingHue(rating)) + 0.05)
	return contrastWithWhite >= 4.5 ? 'white' : DARK_INK
}
