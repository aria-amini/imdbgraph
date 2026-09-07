import { Bug } from '@phosphor-icons/react/dist/ssr'
import { cn } from 'cn'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

/** Footer control that opens an inline bug report form; submissions are
 * anonymous unless an email address is provided. */
export function ReportBug() {
	const [open, setOpen] = useState(false)
	const [message, setMessage] = useState('')
	const [email, setEmail] = useState('')
	const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>(
		'idle',
	)

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
		<div className="relative">
			<button
				type="button"
				aria-expanded={open}
				onClick={() => (open ? reset() : setOpen(true))}
				className={cn(
					'text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1.5 text-xs transition-colors',
					open && 'text-foreground',
				)}
			>
				<Bug aria-hidden className="size-3.5" weight="bold" />
				Report a bug
			</button>
			{open && (
				<form
					onSubmit={submit}
					className={cn(
						'bg-popover absolute right-0 bottom-full z-50 mb-2 w-80',
						'max-w-[calc(100vw-2rem)] rounded-md border p-3 shadow-md',
						'animate-in fade-in slide-in-from-bottom-1 duration-150',
					)}
				>
					{status === 'sent' ? (
						<div className="px-1 py-4 text-center text-sm">
							Thanks — noted.{' '}
							{email
								? 'We will reply by email.'
								: 'No reply unless you left an email.'}
						</div>
					) : (
						<>
							<Textarea
								value={message}
								onChange={(event) => setMessage(event.target.value)}
								placeholder="What went wrong?"
								aria-label="Bug description"
								rows={3}
								className="mb-2 resize-none text-sm"
							/>
							<input
								type="email"
								value={email}
								onChange={(event) => setEmail(event.target.value)}
								placeholder="Email for follow-up (optional)"
								aria-label="Contact email"
								className="border-input bg-input/10 placeholder:text-muted-foreground focus-visible:ring-ring/50 mb-2 h-8 w-full rounded-md border px-2 text-sm outline-none focus-visible:ring-2"
							/>
							<div className="flex items-center justify-end gap-2">
								{status === 'error' && (
									<span aria-live="polite" className="text-destructive text-xs">
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
							</div>
						</>
					)}
				</form>
			)}
		</div>
	)
}
