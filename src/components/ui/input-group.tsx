import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from 'cn'
import { splitProps, type ComponentProps } from 'solid-js'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const inputGroupVariants = cva(
	'data-[pending=true]:cursor-progress data-[pending=true]:opacity-70',
	{
		variants: {
			variant: {
				default: '',
				search: 'bg-input/10 shadow-none transition-opacity',
			},
		},
		defaultVariants: { variant: 'default' },
	},
)

function InputGroup(
	props: ComponentProps<'fieldset'> &
		VariantProps<typeof inputGroupVariants> & { pending?: boolean },
) {
	const [local, rest] = splitProps(props, ['class', 'variant', 'pending'])

	return (
		<fieldset
			data-slot="input-group"
			data-pending={local.pending ?? false}
			data-variant={local.variant ?? 'default'}
			class={cn(
				'group/input-group relative flex h-9 w-full min-w-0 items-center rounded-md border border-input shadow-xs transition-[color,box-shadow] outline-none in-data-[slot=combobox-content]:focus-within:border-inherit in-data-[slot=combobox-content]:focus-within:ring-0 has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-3 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/50 has-[[data-slot][aria-invalid=true]]:border-destructive has-[[data-slot][aria-invalid=true]]:ring-3 has-[[data-slot][aria-invalid=true]]:ring-destructive/20 has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>textarea]:h-auto dark:bg-input/30 dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/40 has-[>[data-align=block-end]]:[&>input]:pt-3 has-[>[data-align=block-start]]:[&>input]:pb-3 has-[>[data-align=inline-end]]:[&>input]:pr-1.5 has-[>[data-align=inline-start]]:[&>input]:pl-1.5',
				inputGroupVariants({ variant: local.variant }),
				local.class,
			)}
			{...rest}
		/>
	)
}

const inputGroupAddonVariants = cva(
	"flex h-auto cursor-text items-center justify-center gap-2 py-1.5 text-sm font-medium text-muted-foreground select-none group-data-[disabled=true]/input-group:opacity-50 group-data-[pending=true]/input-group:opacity-60 [&>kbd]:rounded-[calc(var(--radius)-5px)] [&>svg:not([class*='size-'])]:size-4",
	{
		variants: {
			align: {
				'inline-start':
					'order-first pl-2 has-[>button]:-ml-1 has-[>kbd]:ml-[-0.15rem]',
				'inline-end':
					'order-last pr-2 has-[>button]:-mr-1 has-[>kbd]:mr-[-0.15rem]',
				'block-start':
					'order-first w-full justify-start px-2.5 pt-2 group-has-[>input]/input-group:pt-2 [.border-b]:pb-2',
				'block-end':
					'order-last w-full justify-start px-2.5 pb-2 group-has-[>input]/input-group:pb-2 [.border-t]:pt-2',
			},
		},
		defaultVariants: {
			align: 'inline-start',
		},
	},
)

function InputGroupAddon(
	props: ComponentProps<'div'> & VariantProps<typeof inputGroupAddonVariants>,
) {
	const [local, rest] = splitProps(props, ['class', 'align'])

	return (
		// oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
		<div
			// oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
			role="group"
			data-slot="input-group-addon"
			data-align={local.align ?? 'inline-start'}
			class={cn(inputGroupAddonVariants({ align: local.align }), local.class)}
			onClick={(e) => {
				if (e.target instanceof Element && e.target.closest('button')) {
					return
				}

				e.currentTarget.parentElement?.querySelector('input')?.focus()
			}}
			{...rest}
		/>
	)
}

const inputGroupButtonVariants = cva(
	'flex items-center gap-2 text-sm shadow-none',
	{
		variants: {
			size: {
				xs: "h-6 gap-1 rounded-[calc(var(--radius)-5px)] px-1.5 [&>svg:not([class*='size-'])]:size-3.5",
				sm: '',
				'icon-xs':
					'size-6 rounded-[calc(var(--radius)-5px)] p-0 has-[>svg]:p-0',
				'icon-sm': 'size-8 p-0 has-[>svg]:p-0',
			},
			tone: {
				default: '',
				muted: 'text-muted-foreground hover:text-foreground',
			},
		},
		defaultVariants: {
			size: 'xs',
			tone: 'default',
		},
	},
)

function InputGroupButton(
	props: Omit<ComponentProps<typeof Button>, 'size'> &
		VariantProps<typeof inputGroupButtonVariants>,
) {
	const [local, rest] = splitProps(props, ['class', 'variant', 'size', 'tone'])

	return (
		<Button
			data-size={local.size ?? 'xs'}
			variant={local.variant ?? 'ghost'}
			class={cn(
				inputGroupButtonVariants({ size: local.size, tone: local.tone }),
				local.class,
			)}
			{...rest}
		/>
	)
}

function InputGroupText(props: ComponentProps<'span'>) {
	const [local, rest] = splitProps(props, ['class'])

	return (
		<span
			class={cn(
				"flex items-center gap-2 text-sm text-muted-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
				local.class,
			)}
			{...rest}
		/>
	)
}

function InputGroupInput(props: ComponentProps<'input'>) {
	const [local, rest] = splitProps(props, ['class'])

	return (
		<Input
			data-slot="input-group-control"
			class={cn(
				'flex-1 rounded-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0 aria-invalid:ring-0 dark:bg-transparent',
				local.class,
			)}
			{...rest}
		/>
	)
}

function InputGroupTextarea(props: ComponentProps<'textarea'>) {
	const [local, rest] = splitProps(props, ['class'])

	return (
		<Textarea
			data-slot="input-group-control"
			class={cn(
				'flex-1 resize-none rounded-none border-0 bg-transparent py-2 shadow-none ring-0 focus-visible:ring-0 aria-invalid:ring-0 dark:bg-transparent',
				local.class,
			)}
			{...rest}
		/>
	)
}

export {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupText,
	InputGroupInput,
	InputGroupTextarea,
}
