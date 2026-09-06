import { cn } from 'cn'
import { Loader2Icon } from 'lucide-react'

function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
	return (
		<Loader2Icon
			data-slot="spinner"
			// oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
			role="status"
			aria-label="Loading"
			className={cn('size-4 animate-spin', className)}
			{...props}
		/>
	)
}

export { Spinner }
