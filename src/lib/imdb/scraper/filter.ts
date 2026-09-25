const showTypes = new Set(['tvSeries', 'tvShort', 'tvSpecial', 'tvMiniSeries'])

interface ParsedRatingsLine {
	imdbId: string | undefined
	numVotes: number
}

interface ParsedEpisodeLine {
	episodeId: string | undefined
	showId: string | undefined
}

/** Parses an IMDb ratings TSV row. */
export function parseRatingsLine(line: string): ParsedRatingsLine {
	const [imdbId, , numVotesRaw] = line.split('\t')

	return { imdbId, numVotes: Number(numVotesRaw) }
}

/** Parses an IMDb episode TSV row. */
export function parseEpisodeLine(line: string): ParsedEpisodeLine {
	const [episodeId, showId] = line.split('\t')

	return { episodeId, showId }
}

/** Returns whether an IMDb title row should be copied into the database. */
export function shouldCopyTitle(
	line: string,
	ratedIds: ReadonlySet<string>,
	validShowIds: ReadonlySet<string>,
): boolean {
	const [imdbId, titleType, , , , startYear] = line.split('\t')

	if (!imdbId || !titleType) return false

	if (titleType === 'tvEpisode') return ratedIds.has(imdbId)

	return Boolean(
		showTypes.has(titleType) &&
		startYear &&
		startYear !== '\\N' &&
		validShowIds.has(imdbId),
	)
}
