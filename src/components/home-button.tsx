import { cn } from 'cn'
import { Home } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'

export function HomeButton({ className }: { className?: string }) {
	return (
		<a
			href="/"
			className={cn(
				buttonVariants({ variant: 'default', size: 'icon' }),
				className,
			)}
		>
			<Home />
		</a>
	)
}
