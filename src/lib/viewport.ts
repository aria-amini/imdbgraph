import { useEffect, useState } from 'react'

// Centers fixed content inside the visual viewport so the iOS keyboard never
// covers it; layout-viewport centering leaves content behind the keys.
export function useViewportCenteredStyle(
	open: boolean,
): React.CSSProperties | undefined {
	const [style, setStyle] = useState<React.CSSProperties | undefined>(undefined)

	useEffect(() => {
		if (!open) {
			setStyle(undefined)
			return
		}
		const viewport = window.visualViewport
		if (!viewport) return
		const sync = () =>
			setStyle({ top: viewport.offsetTop + viewport.height / 2 })
		sync()
		// Safari can skip the final resize event while the keyboard animates.
		const timers = [100, 300, 700].map((ms) => setTimeout(sync, ms))
		viewport.addEventListener('resize', sync)
		viewport.addEventListener('scroll', sync)
		return () => {
			timers.forEach(clearTimeout)
			viewport.removeEventListener('resize', sync)
			viewport.removeEventListener('scroll', sync)
		}
	}, [open])

	return style
}
