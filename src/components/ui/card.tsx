import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from 'cn'
import { splitProps, type ComponentProps } from 'solid-js'

const cardVariants = cva(
	'group/card flex flex-col overflow-hidden border border-border bg-card text-sm text-card-foreground has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0',
	{
		variants: {
			variant: {
				default:
					'gap-4 rounded-lg py-4 shadow-sm data-[size=sm]:gap-3 data-[size=sm]:py-3 data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-lg *:[img:last-child]:rounded-b-lg',
				chart: 'gap-0 rounded-none py-0 shadow-none',
				tooltip: 'gap-1.5 rounded-lg px-3 py-2.5 shadow-lg',
			},
		},
		defaultVariants: { variant: 'default' },
	},
)

function Card(
	props: ComponentProps<'div'> &
		VariantProps<typeof cardVariants> & { size?: 'default' | 'sm' },
) {
	const [local, rest] = splitProps(props, ['class', 'size', 'variant'])

	return (
		<div
			data-slot="card"
			data-size={local.size ?? 'default'}
			data-variant={local.variant ?? 'default'}
			class={cn(cardVariants({ variant: local.variant }), local.class)}
			{...rest}
		/>
	)
}

function CardHeader(props: ComponentProps<'div'>) {
	const [local, rest] = splitProps(props, ['class'])

	return (
		<div
			data-slot="card-header"
			class={cn(
				'group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-lg px-4 group-data-[size=sm]/card:px-3 group-data-[variant=tooltip]/card:px-0 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-4 group-data-[size=sm]/card:[.border-b]:pb-3',
				local.class,
			)}
			{...rest}
		/>
	)
}

function CardTitle(props: ComponentProps<'div'>) {
	const [local, rest] = splitProps(props, ['class'])

	return (
		<div
			data-slot="card-title"
			class={cn(
				'text-base leading-snug font-medium group-data-[size=sm]/card:text-sm group-data-[variant=tooltip]/card:font-mono group-data-[variant=tooltip]/card:text-xs group-data-[variant=tooltip]/card:font-bold group-data-[variant=tooltip]/card:tracking-widest',
				local.class,
			)}
			{...rest}
		/>
	)
}

const cardDescriptionVariants = cva(
	'text-sm text-muted-foreground group-data-[variant=tooltip]/card:text-xs',
	{
		variants: {
			variant: {
				default: 'group-data-[variant=tooltip]/card:leading-snug',
				numeric: 'font-mono tabular-nums',
			},
		},
		defaultVariants: { variant: 'default' },
	},
)

function CardDescription(
	props: ComponentProps<'div'> & VariantProps<typeof cardDescriptionVariants>,
) {
	const [local, rest] = splitProps(props, ['class', 'variant'])

	return (
		<div
			data-slot="card-description"
			class={cn(
				cardDescriptionVariants({ variant: local.variant }),
				local.class,
			)}
			{...rest}
		/>
	)
}

function CardAction(props: ComponentProps<'div'>) {
	const [local, rest] = splitProps(props, ['class'])

	return (
		<div
			data-slot="card-action"
			class={cn(
				'col-start-2 row-span-2 row-start-1 self-start justify-self-end',
				local.class,
			)}
			{...rest}
		/>
	)
}

function CardContent(props: ComponentProps<'div'>) {
	const [local, rest] = splitProps(props, ['class'])

	return (
		<div
			data-slot="card-content"
			class={cn(
				'px-4 group-data-[size=sm]/card:px-3 group-data-[variant=chart]/card:py-6 sm:group-data-[variant=chart]/card:px-6 lg:group-data-[variant=chart]/card:px-8 group-data-[variant=tooltip]/card:px-0',
				local.class,
			)}
			{...rest}
		/>
	)
}

function CardFooter(props: ComponentProps<'div'>) {
	const [local, rest] = splitProps(props, ['class'])

	return (
		<div
			data-slot="card-footer"
			class={cn(
				'flex items-center rounded-b-lg border-t bg-muted/50 p-4 group-data-[size=sm]/card:p-3',
				local.class,
			)}
			{...rest}
		/>
	)
}

export {
	Card,
	CardHeader,
	CardFooter,
	CardTitle,
	CardAction,
	CardDescription,
	CardContent,
}
