import { cn } from 'cn'
import * as React from 'react'
import * as RechartsPrimitive from 'recharts'
import type {
	LegendPayload,
	TooltipPayloadEntry,
	TooltipValueType,
} from 'recharts'
import { z } from 'zod'

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: '', dark: '.dark' } as const

const INITIAL_DIMENSION = { width: 320, height: 200 } as const

type TooltipNameType = number | string

type ChartCustomProperties = React.CSSProperties &
	Record<`--${string}`, string | number | undefined>

export type ChartConfig = Record<
	string,
	{
		label?: React.ReactNode
		icon?: React.ComponentType
	} & (
		| { color?: string; theme?: never }
		| { color?: never; theme: Record<keyof typeof THEMES, string> }
	)
>

type ChartContextProps = {
	config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
	const context = React.useContext(ChartContext)

	if (!context) {
		throw new Error('useChart must be used within a <ChartContainer />')
	}

	return context
}

function ChartContainer({
	id,
	className,
	children,
	config,
	initialDimension = INITIAL_DIMENSION,
	...props
}: React.ComponentProps<'div'> & {
	config: ChartConfig
	children: React.ComponentProps<
		typeof RechartsPrimitive.ResponsiveContainer
	>['children']
	initialDimension?: {
		width: number
		height: number
	}
}) {
	const uniqueId = React.useId()
	const chartId = `chart-${id ?? uniqueId.replace(/:/g, '')}`

	return (
		<ChartContext.Provider value={{ config }}>
			<div
				data-slot="chart"
				data-chart={chartId}
				className={cn(
					"flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden",
					className,
				)}
				{...props}
			>
				<ChartStyle id={chartId} config={config} />
				<RechartsPrimitive.ResponsiveContainer
					initialDimension={initialDimension}
				>
					{children}
				</RechartsPrimitive.ResponsiveContainer>
			</div>
		</ChartContext.Provider>
	)
}

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
	const colorConfig = Object.entries(config).filter(
		([, config]) => config.theme ?? config.color,
	)

	if (!colorConfig.length) {
		return null
	}

	return (
		// oxlint-disable-next-line shadcn/no-inline-styles -- Chart colors depend on the current series and theme.
		<style
			dangerouslySetInnerHTML={{
				__html: Object.entries(THEMES)
					.map(
						([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
	.map(([key, itemConfig]) => {
		const color =
			(theme === 'light' ? itemConfig.theme?.light : itemConfig.theme?.dark) ??
			itemConfig.color

		return color ? `  --color-${key}: ${color};` : null
	})
	.join('\n')}
}
`,
					)
					.join('\n'),
			}}
		/>
	)
}

const ChartTooltip = RechartsPrimitive.Tooltip

function ChartTooltipContent({
	active,
	payload,
	className,
	indicator = 'dot',
	hideLabel = false,
	hideIndicator = false,
	label,
	labelFormatter,
	labelClassName,
	formatter,
	color,
	nameKey,
	labelKey,
}: React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
	React.ComponentProps<'div'> & {
		hideLabel?: boolean
		hideIndicator?: boolean
		indicator?: 'line' | 'dot' | 'dashed'
		nameKey?: string
		labelKey?: string
	} & Omit<
		RechartsPrimitive.DefaultTooltipContentProps<
			TooltipValueType,
			TooltipNameType
		>,
		'accessibilityLayer'
	>) {
	const { config } = useChart()

	const tooltipLabel = React.useMemo(() => {
		if (hideLabel || !payload?.length) {
			return null
		}

		const [item] = payload
		// oxlint-disable-next-line typescript/restrict-template-expressions
		const key = `${labelKey ?? item?.dataKey ?? item?.name ?? 'value'}`
		const itemConfig = getPayloadConfigFromPayload(config, item, key)

		const parsedLabel = !labelKey ? z.string().safeParse(label) : null

		const value = parsedLabel?.success
			? (config[parsedLabel.data]?.label ?? parsedLabel.data)
			: itemConfig?.label

		if (labelFormatter) {
			return (
				<div className={cn('font-medium', labelClassName)}>
					{labelFormatter(value, payload)}
				</div>
			)
		}

		if (!value) {
			return null
		}

		return <div className={cn('font-medium', labelClassName)}>{value}</div>
	}, [
		label,
		labelFormatter,
		payload,
		hideLabel,
		labelClassName,
		config,
		labelKey,
	])

	if (!active || !payload?.length) {
		return null
	}

	const nestLabel = payload.length === 1 && indicator !== 'dot'

	return (
		<div
			className={cn(
				'grid min-w-32 items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl',
				className,
			)}
		>
			{!nestLabel ? tooltipLabel : null}
			<div className="grid gap-1.5">
				{payload
					.filter((item) => item.type !== 'none')
					.map((item, index) => {
						// oxlint-disable-next-line typescript/restrict-template-expressions
						const key = `${nameKey ?? item.name ?? item.dataKey ?? 'value'}`
						const itemConfig = getPayloadConfigFromPayload(config, item, key)
						const indicatorColor = color ?? item.payload?.fill ?? item.color

						const indicatorStyle: ChartCustomProperties = {
							'--color-bg': indicatorColor,
							'--color-border': indicatorColor,
						}

						return (
							<div
								key={index}
								className={cn(
									'flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground',
									indicator === 'dot' && 'items-center',
								)}
							>
								{formatter && item?.value !== undefined && item.name ? (
									formatter(item.value, item.name, item, index, item.payload)
								) : (
									<>
										{itemConfig?.icon ? (
											<itemConfig.icon />
										) : (
											!hideIndicator && (
												<div
													className={cn(
														'shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)',
														{
															'h-2.5 w-2.5': indicator === 'dot',
															'w-1': indicator === 'line',
															'w-0 border-[1.5px] border-dashed bg-transparent':
																indicator === 'dashed',
															'my-0.5': nestLabel && indicator === 'dashed',
														},
													)}
													style={indicatorStyle}
												/>
											)
										)}
										<div
											className={cn(
												'flex flex-1 justify-between leading-none',
												nestLabel ? 'items-end' : 'items-center',
											)}
										>
											<div className="grid gap-1.5">
												{nestLabel ? tooltipLabel : null}
												<span className="text-muted-foreground">
													{itemConfig?.label ?? item.name}
												</span>
											</div>
											{item.value != null && (
												<span className="text-foreground font-mono font-medium tabular-nums">
													{item.value.toLocaleString()}
												</span>
											)}
										</div>
									</>
								)}
							</div>
						)
					})}
			</div>
		</div>
	)
}

const ChartLegend = RechartsPrimitive.Legend

function ChartLegendContent({
	className,
	hideIcon = false,
	payload,
	verticalAlign = 'bottom',
	nameKey,
}: React.ComponentProps<'div'> & {
	hideIcon?: boolean
	nameKey?: string
} & RechartsPrimitive.DefaultLegendContentProps) {
	const { config } = useChart()

	if (!payload?.length) {
		return null
	}

	return (
		<div
			className={cn(
				'flex items-center justify-center gap-4',
				verticalAlign === 'top' ? 'pb-3' : 'pt-3',
				className,
			)}
		>
			{payload
				.filter((item) => item.type !== 'none')
				.map((item, index) => {
					// oxlint-disable-next-line typescript/restrict-template-expressions
					const key = `${nameKey ?? item.dataKey ?? 'value'}`
					const itemConfig = getPayloadConfigFromPayload(config, item, key)

					return (
						<div
							key={index}
							className={cn(
								'flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground',
							)}
						>
							{itemConfig?.icon && !hideIcon ? (
								<itemConfig.icon />
							) : (
								<div
									className="h-2 w-2 shrink-0 rounded-[2px] bg-(--indicator-color)"
									style={{
										'--indicator-color': item.color,
									}}
								/>
							)}
							{itemConfig?.label}
						</div>
					)
				})}
		</div>
	)
}

type ChartPayloadEntry = TooltipPayloadEntry | LegendPayload

function readStringField(
	source: ChartPayloadEntry,
	key: string,
): string | undefined {
	const entry = Object.entries(source).find(([entryKey]) => entryKey === key)

	if (entry === undefined) {
		return undefined
	}

	const value = z.string().safeParse(entry[1])

	return value.success ? value.data : undefined
}

const payloadRecord = z.record(z.string(), z.unknown())

function getPayloadConfigFromPayload(
	config: ChartConfig,
	item: ChartPayloadEntry | undefined,
	key: string,
) {
	if (item === undefined) {
		return undefined
	}

	let configLabelKey = key

	const direct = readStringField(item, key)

	if (direct !== undefined) {
		configLabelKey = direct
	} else {
		const nested = payloadRecord.safeParse(item.payload)

		if (nested.success) {
			const nestedValue = z.string().safeParse(nested.data[key])

			if (nestedValue.success) {
				configLabelKey = nestedValue.data
			}
		}
	}

	return configLabelKey in config ? config[configLabelKey] : config[key]
}

export {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	ChartLegend,
	ChartLegendContent,
	ChartStyle,
}
