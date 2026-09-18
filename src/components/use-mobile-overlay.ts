import { useRef, useState, type RefObject } from 'react'

import { useBrowserLayoutEffect } from '@/lib/use-browser-layout-effect'

// iOS Safari scrolls the visual viewport when the keyboard opens, which
// pushes fixed top:0 content behind the browser chrome; the overlay tracks
// visualViewport so it stays aligned with the visible area.
interface OverlayViewport {
	top: number
	height: number
}

/**
 * Tracks the visual viewport for the mobile search overlay and replays the
 * search row's page position as a slide into the dialog. Call `begin` right
 * before activating the overlay so `active` can FLIP from the captured rect.
 */
export function useMobileOverlay(
	active: boolean,
	inputRowRef: RefObject<HTMLDivElement | null>,
) {
	const preOverlayRectRef = useRef<DOMRect | null>(null)
	const [viewport, setViewport] = useState<OverlayViewport | null>(null)

	// Layout timing keeps the first active frame positioned to the real
	// visual viewport instead of flashing full-height geometry.
	useBrowserLayoutEffect(() => {
		if (!active) return
		const visualViewport = window.visualViewport
		if (!visualViewport) return
		const sync = () =>
			setViewport({
				top: visualViewport.offsetTop,
				height: visualViewport.height,
			})
		sync()
		// Safari can skip the final resize event while the keyboard animates.
		const timers = [300, 700].map((ms) => setTimeout(sync, ms))
		visualViewport.addEventListener('resize', sync)
		visualViewport.addEventListener('scroll', sync)
		return () => {
			timers.forEach(clearTimeout)
			visualViewport.removeEventListener('resize', sync)
			visualViewport.removeEventListener('scroll', sync)
		}
	}, [active])

	// FLIP: the searchbar slides from its page position to the top of the
	// mobile dialog so the input keeps visual continuity across the jump.
	useBrowserLayoutEffect(() => {
		if (!active) return
		const row = inputRowRef.current
		const before = preOverlayRectRef.current
		preOverlayRectRef.current = null
		if (!row || !before) return
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
		const deltaY = before.top - row.getBoundingClientRect().top
		if (Math.abs(deltaY) < 2) return
		row.style.transform = `translateY(${deltaY}px)`
		const frame = requestAnimationFrame(() => {
			row.style.transition = 'transform 280ms cubic-bezier(0.16, 1, 0.3, 1)'
			row.style.transform = ''
		})
		const settled = setTimeout(() => {
			row.style.transition = ''
		}, 400)
		return () => {
			cancelAnimationFrame(frame)
			clearTimeout(settled)
			row.style.transition = ''
			row.style.transform = ''
		}
	}, [active, inputRowRef])

	const begin = (row: HTMLDivElement | null) => {
		preOverlayRectRef.current = row?.getBoundingClientRect() ?? null
	}

	return { viewport, begin }
}
