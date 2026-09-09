import { Chats } from '@phosphor-icons/react/dist/ssr'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useViewportCenteredStyle } from '@/lib/viewport'

/** Footer control opening a centered feedback dialog; submissions are
 * anonymous unless an email address is provided. */
export function FeedbackDialog() {
	const [open, setOpen] = useState(false)
	const [message, setMessage] = useState('')
	const [email, setEmail] = useState('')
	const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>(
		'idle',
	)
	const contentStyle = useViewportCenteredStyle(open)

	const submit = async (event: React.FormEvent) => {
		event.preventDefault()
		if (!message.trim() || status === 'sending') return
		setStatus('sending')
		try {
			const response = await fetch('/api/feedback', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ message, email }),
			})
			setStatus(response.ok ? 'sent' : 'error')
		} catch {
			setStatus('error')
		}
	}

	const reset = () => {
		setOpen(false)
		setMessage('')
		setEmail('')
		setStatus('idle')
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => (next ? setOpen(true) : reset())}
		>
			<DialogTrigger className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1.5 text-xs transition-colors">
				<Chats aria-hidden className="size-3.5" weight="bold" />
				Feedback
			</DialogTrigger>
			<DialogContent style={contentStyle}>
				<DialogHeader>
					<DialogTitle>Feedback</DialogTitle>
					<DialogDescription>
						Anonymous unless you leave an email.
					</DialogDescription>
				</DialogHeader>
				{status === 'sent' ? (
					<div className="px-1 py-4 text-center text-sm">
						Thanks — noted.{' '}
						{email
							? 'We will reply by email.'
							: 'No reply unless you left an email.'}
					</div>
				) : (
					<form onSubmit={submit} className="grid gap-3">
						<Textarea
							value={message}
							onChange={(event) => setMessage(event.target.value)}
							placeholder="What would you change?"
							aria-label="Feedback"
							rows={3}
							className="resize-none"
						/>
						<input
							type="email"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							placeholder="Email for follow-up (optional)"
							aria-label="Contact email"
							className="border-input bg-input/10 placeholder:text-muted-foreground focus-visible:ring-ring/50 h-9 w-full rounded-md border px-2 text-base outline-none focus-visible:ring-2 md:h-8 md:text-sm"
						/>
						<DialogFooter className="items-center">
							{status === 'error' && (
								<span
									aria-live="polite"
									className="text-destructive mr-auto text-xs"
								>
									Failed — try again
								</span>
							)}
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="h-8 text-xs"
								onClick={reset}
							>
								Cancel
							</Button>
							<Button
								type="submit"
								size="sm"
								className="h-8 text-xs"
								disabled={status === 'sending' || !message.trim()}
							>
								{status === 'sending' ? 'Sending…' : 'Send'}
							</Button>
						</DialogFooter>
					</form>
				)}
			</DialogContent>
		</Dialog>
	)
}
