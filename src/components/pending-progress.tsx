export function PendingProgress() {
	return (
		<output
			aria-label="Loading page"
			className="bg-primary/25 fixed inset-x-0 top-0 z-50 block h-0.5 overflow-hidden"
		>
			<div className="bg-primary h-full w-1/4 animate-[pending-slide_1.2s_ease-in-out_infinite]" />
		</output>
	)
}
