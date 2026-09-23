import { cn } from 'cn'
import * as React from 'react'

function Card({
	className,
	size = 'default',
	variant = 'default',
	...props
}: React.ComponentProps<'div'> & {
	size?: 'default' | 'sm'
	variant?: 'default' | 'graph' | 'tooltip'
}) {
	return (
		<div
			data-slot="card"
			data-size={size}
			data-variant={variant}
			className={cn(
				'group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl bg-card py-(--card-spacing) text-sm text-card-foreground shadow-xs ring-1 ring-foreground/10 [--card-spacing:--spacing(6)] has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(4)] *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl',
				variant === 'graph' && 'gap-0 rounded-none py-0 shadow-none',
				variant === 'tooltip' && 'gap-1.5 px-3 py-2.5 shadow-lg',
				className,
			)}
			{...props}
		/>
	)
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card-header"
			className={cn(
				'group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-(--card-spacing) group-data-[variant=tooltip]/card:px-0 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)',
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
				'text-base leading-normal font-medium group-data-[size=sm]/card:text-sm group-data-[variant=tooltip]/card:font-mono group-data-[variant=tooltip]/card:text-xs group-data-[variant=tooltip]/card:font-bold group-data-[variant=tooltip]/card:tracking-widest',
				className,
			)}
			{...props}
		/>
	)
}

function CardDescription({
	className,
	variant = 'default',
	...props
}: React.ComponentProps<'div'> & {
	variant?: 'default' | 'tooltip-title' | 'tooltip-rating'
}) {
	return (
		<div
			data-slot="card-description"
			className={cn(
				'text-sm text-muted-foreground',
				variant === 'tooltip-title' && 'text-xs leading-snug',
				variant === 'tooltip-rating' && 'font-mono text-xs tabular-nums',
				className,
			)}
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
				'flex flex-col gap-3 px-(--card-spacing) group-data-[variant=graph]/card:px-4 group-data-[variant=graph]/card:py-6 sm:group-data-[variant=graph]/card:px-6 lg:group-data-[variant=graph]/card:px-8 group-data-[variant=tooltip]/card:px-0',
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
				'flex items-center rounded-b-xl px-(--card-spacing) [.border-t]:pt-(--card-spacing)',
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
