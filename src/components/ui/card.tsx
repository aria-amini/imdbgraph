import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from 'cn'
import * as React from 'react'

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

function Card({
	className,
	size = 'default',
	variant = 'default',
	...props
}: React.ComponentProps<'div'> &
	VariantProps<typeof cardVariants> & { size?: 'default' | 'sm' }) {
	return (
		<div
			data-slot="card"
			data-size={size}
			data-variant={variant}
			className={cn(cardVariants({ variant }), className)}
			{...props}
		/>
	)
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card-header"
			className={cn(
				'group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-lg px-4 group-data-[size=sm]/card:px-3 group-data-[variant=tooltip]/card:px-0 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-4 group-data-[size=sm]/card:[.border-b]:pb-3',
				className,
			)}
			{...props}
		/>
	)
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card-title"
			className={cn(
				'text-base leading-snug font-medium group-data-[size=sm]/card:text-sm group-data-[variant=tooltip]/card:font-mono group-data-[variant=tooltip]/card:text-xs group-data-[variant=tooltip]/card:font-bold group-data-[variant=tooltip]/card:tracking-widest',
				className,
			)}
			{...props}
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

function CardDescription({
	className,
	variant = 'default',
	...props
}: React.ComponentProps<'div'> & VariantProps<typeof cardDescriptionVariants>) {
	return (
		<div
			data-slot="card-description"
			className={cn(cardDescriptionVariants({ variant }), className)}
			{...props}
		/>
	)
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card-action"
			className={cn(
				'col-start-2 row-span-2 row-start-1 self-start justify-self-end',
				className,
			)}
			{...props}
		/>
	)
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card-content"
			className={cn(
				'px-4 group-data-[size=sm]/card:px-3 group-data-[variant=chart]/card:py-6 sm:group-data-[variant=chart]/card:px-6 lg:group-data-[variant=chart]/card:px-8 group-data-[variant=tooltip]/card:px-0',
				className,
			)}
			{...props}
		/>
	)
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card-footer"
			className={cn(
				'flex items-center rounded-b-lg border-t bg-muted/50 p-4 group-data-[size=sm]/card:p-3',
				className,
			)}
			{...props}
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
