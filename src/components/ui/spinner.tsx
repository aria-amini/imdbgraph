import { cn } from 'cn'
import { splitProps, type ComponentProps } from 'solid-js'

import { CircleNotchBold } from '@/components/icons'

function Spinner(props: ComponentProps<typeof CircleNotchBold>) {
	const [local, rest] = splitProps(props, ['class'])

	return (
		<CircleNotchBold
			data-slot="spinner"
			// oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
			role="status"
			aria-label="Loading"
			class={cn('size-4 animate-spin', local.class)}
			{...rest}
		/>
	)
}

export { Spinner }
