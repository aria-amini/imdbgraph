import { Home } from 'lucide-react'

import { Button } from '@/components/ui/button'

export function HomeButton({ className }: { className?: string }) {
	return (
		<Button className={className} variant="default" size="icon" asChild={true}>
			<a href="/">
				<Home />
			</a>
		</Button>
	)
}
