import { Home } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from './ui/button'

interface NavbarProps {
	center?: ReactNode
}

export function Navbar({ center }: NavbarProps) {
	return (
		<nav className="grid grid-cols-[1fr_minmax(0,28rem)_1fr] items-center gap-2 border-b px-4 py-3 md:px-6">
			<Button
				className="justify-self-start"
				variant="outline"
				size="icon"
				asChild={true}
			>
				<a href="/">
					<Home />
				</a>
			</Button>
			{center && <div className="col-start-2 w-full">{center}</div>}
		</nav>
	)
}
