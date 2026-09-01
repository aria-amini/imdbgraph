const showTypes = new Set(['tvSeries', 'tvShort', 'tvSpecial', 'tvMiniSeries'])

export function parseRatingsLine(line: string): {
	imdbId: string | undefined
	numVotes: number
} {
	const [imdbId, , numVotesRaw] = line.split('\t')
	return { imdbId, numVotes: Number(numVotesRaw) }
}

export function parseEpisodeLine(line: string): {
	episodeId: string | undefined
	showId: string | undefined
} {
	const [episodeId, showId] = line.split('\t')
	return { episodeId, showId }
}

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
