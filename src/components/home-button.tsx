import { House } from '@phosphor-icons/react/dist/ssr'
import { cn } from 'cn'

import { buttonVariants } from '@/components/ui/button'

/** Renders the application home-navigation button. */
export function HomeButton({ className }: { className?: string }) {
	return (
		<a
			href="/"
			className={cn(
				buttonVariants({ variant: 'default', size: 'icon' }),
				className,
			)}
		>
			<House weight="bold" />
		</a>
	)
}
