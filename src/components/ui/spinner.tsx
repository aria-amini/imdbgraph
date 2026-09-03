import { Loader2Icon } from 'lucide-react'

import { cn } from '@/lib/utils'

/* oxlint-disable jsx-a11y/prefer-tag-over-role */
// role="status" is the correct live-region semantics; the rule's suggested
// <output> element is for form calculation results.
function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
	return (
		<Loader2Icon
			role="status"
			aria-label="Loading"
			className={cn('size-4 animate-spin', className)}
			{...props}
		/>
	)
}

export { Spinner }
