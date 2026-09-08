'use client'

import type { ReactNode } from 'react'
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

const episodeSchema: z.ZodType<Omit<Episode, 'episodeId'>> = z.object({
	title: z.string(),
	seasonNum: z.number(),
	episodeNum: z.number(),
	rating: z.number(),
	numVotes: z.number(),
})

/** Renders episode ratings as a season-by-season line chart. */
export function Graph({
	ratings,
	toolbar,
}: {
	ratings: Ratings
	toolbar?: ReactNode
}) {
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
		<Card
			data-testid="ratings-graph"
			className="border-border bg-card gap-0 rounded-none py-0 shadow-none"
		>
			{toolbar && (
				<div className="border-border flex flex-wrap items-center justify-end gap-x-4 gap-y-2 border-b px-4 py-2 sm:px-6 lg:px-8">
					{toolbar}
				</div>
			)}
			<CardContent className="px-4 py-6 sm:px-6 sm:py-6 lg:px-8">
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
		<Card className="gap-1.5 px-3 py-2.5 shadow-lg">
			<CardHeader className="px-0">
				<CardTitle className="font-mono text-xs font-bold tracking-widest">
					S{episodeData.seasonNum}E{episodeData.episodeNum}:
				</CardTitle>
				<CardDescription className="text-xs leading-snug">
					{episodeData.title}
				</CardDescription>
			</CardHeader>
			<CardContent className="px-0">
				<CardDescription className="font-mono text-xs tabular-nums">
					{episodeData.rating.toFixed(1)} / 10.0 (
					{episodeData.numVotes.toLocaleString()} votes)
				</CardDescription>
			</CardContent>
		</Card>
	)
}
