import { Bug } from '@phosphor-icons/react/dist/ssr'
import { cn } from 'cn'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

/** Footer control opening a centered bug-report dialog; submissions are
 * anonymous unless an email address is provided. */
export function ReportBug() {
	const [open, setOpen] = useState(false)
	const [message, setMessage] = useState('')
	const [email, setEmail] = useState('')
	const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>(
		'idle',
	)
	const descriptionRef = useRef<HTMLTextAreaElement>(null)

	useEffect(() => {
		if (!open) return
		descriptionRef.current?.focus()
		document.body.style.overflow = 'hidden'
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				reset()
			}
		}
		document.addEventListener('keydown', onKeyDown)
		return () => {
			document.body.style.overflow = ''
			document.removeEventListener('keydown', onKeyDown)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open])

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
		<>
			<button
				type="button"
				aria-haspopup="dialog"
				aria-expanded={open}
				onClick={() => setOpen(true)}
				className={cn(
					'text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1.5 text-xs transition-colors',
				)}
			>
				<Bug aria-hidden className="size-3.5" weight="bold" />
				Report a bug
			</button>
			{open && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					<div
						aria-hidden
						onClick={reset}
						className="bg-background/60 animate-in fade-in absolute inset-0 backdrop-blur-sm duration-200"
					/>
					<form
						role="dialog"
						aria-modal="true"
						aria-label="Report a bug"
						onSubmit={submit}
						className={cn(
							'bg-popover animate-in fade-in zoom-in-95 relative z-10 w-full max-w-md rounded-lg border p-4 shadow-lg duration-200',
						)}
					>
						{status === 'sent' ? (
							<div className="px-1 py-6 text-center text-sm">
								Thanks — noted.{' '}
								{email
									? 'We will reply by email.'
									: 'No reply unless you left an email.'}
							</div>
						) : (
							<>
								<h2 className="text-sm font-semibold">Report a bug</h2>
								<p className="text-muted-foreground mt-0.5 text-xs">
									Anonymous unless you leave an email.
								</p>
								<Textarea
									ref={descriptionRef}
									value={message}
									onChange={(event) => setMessage(event.target.value)}
									placeholder="What went wrong?"
									aria-label="Bug description"
									rows={5}
									className="mt-3 mb-2 resize-none text-sm"
								/>
								<input
									type="email"
									value={email}
									onChange={(event) => setEmail(event.target.value)}
									placeholder="Email for follow-up (optional)"
									aria-label="Contact email"
									className="border-input bg-input/10 placeholder:text-muted-foreground focus-visible:ring-ring/50 mb-3 h-8 w-full rounded-md border px-2 text-sm outline-none focus-visible:ring-2"
								/>
								<div className="flex items-center justify-end gap-2">
									{status === 'error' && (
										<span
											aria-live="polite"
											className="text-destructive text-xs"
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
								</div>
							</>
						)}
					</form>
				</div>
			)}
		</>
	)
}
