'use client'

import {
	CartesianGrid,
	Line,
	LineChart,
	type TooltipContentProps,
	XAxis,
	YAxis,
} from 'recharts'
import { z } from 'zod'

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
} from '@/components/ui/chart'
import { transformRatingsData } from '@/lib/imdb/chart-data'
import type { Episode, Ratings } from '@/lib/imdb/types'

const episodeSchema: z.ZodType<Episode> = z.object({
	title: z.string(),
	seasonNum: z.number(),
	episodeNum: z.number(),
	rating: z.number(),
	numVotes: z.number(),
})

/** Renders episode ratings as a season-by-season line chart. */
export function Graph({ ratings }: { ratings: Ratings }) {
	const { data: chartData, seasons } = transformRatingsData(ratings)
	const chartConfig: ChartConfig = {}
	const chartColors = [
		'var(--chart-1)',
		'var(--chart-2)',
		'var(--chart-3)',
		'var(--chart-4)',
		'var(--chart-5)',
	]

	seasons.forEach((seasonNum, index) => {
		chartConfig[`season${seasonNum}`] = {
			label: `Season ${seasonNum}`,
			color: chartColors[index % chartColors.length] ?? 'var(--chart-1)',
		}
	})

	return (
		<Card data-testid="ratings-graph" className="px-2 py-4 sm:px-4 lg:px-8">
			<CardContent className="px-0">
				<ChartContainer
					config={chartConfig}
					className="aspect-auto h-[clamp(260px,min(56vw,calc(100dvh-12rem)),620px)]"
				>
					<LineChart
						accessibilityLayer
						data={chartData}
						margin={{
							left: 12,
							right: 12,
						}}
					>
						<CartesianGrid vertical={false} />
						<XAxis
							dataKey="episodeIndex"
							tick={false}
							domain={[0, 'dataMax']}
						/>
						<YAxis
							tickLine={true}
							axisLine={true}
							tick={true}
							allowDecimals={false}
							width={20} // Fixes bug where there's too much margin on left.
							domain={[(dataMin: number) => Math.floor(dataMin), 10.0]}
						/>
						<ChartTooltip content={CustomTooltip} />
						{seasons.map((seasonNum) => (
							<Line
								key={seasonNum}
								dataKey={`season${seasonNum}`}
								type="linear"
								isAnimationActive={false}
								stroke={
									chartConfig[`season${seasonNum}`]?.color ?? 'var(--chart-1)'
								}
								strokeWidth={2}
								dot={true}
								connectNulls={false}
							/>
						))}
					</LineChart>
				</ChartContainer>
			</CardContent>
		</Card>
	)
}

const CustomTooltip = ({ active, payload }: TooltipContentProps) => {
	if (!active || !payload || payload.length == 0) {
		return null
	}
	const activeData = payload.find((item) => item.value !== null)
	if (!activeData) {
		return null
	}
	const seasonNum = activeData.dataKey?.toString()?.replace('season', '')
	const episode = episodeSchema.safeParse(
		activeData.payload[`episode${seasonNum}`],
	)
	if (!episode.success) {
		return null
	}
	const episodeData = episode.data

	return (
		<Card>
			<CardHeader>
				<CardTitle>
					S{episodeData.seasonNum}E{episodeData.episodeNum}:
				</CardTitle>
				<CardDescription>{episodeData.title}</CardDescription>
			</CardHeader>
			<CardContent>
				<CardDescription>
					{episodeData.rating.toFixed(1)} / 10.0 (
					{episodeData.numVotes.toLocaleString()} votes)
				</CardDescription>
			</CardContent>
		</Card>
	)
}
