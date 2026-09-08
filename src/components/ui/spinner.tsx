import { CircleNotch } from '@phosphor-icons/react/dist/ssr'
import { cn } from 'cn'

function Spinner({
	className,
	...props
}: React.ComponentProps<typeof CircleNotch>) {
	return (
		<CircleNotch
			data-slot="spinner"
			// oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
			role="status"
			aria-label="Loading"
			className={cn('size-4 animate-spin', className)}
			weight="bold"
			{...props}
		/>
	)
}

export { Spinner }
