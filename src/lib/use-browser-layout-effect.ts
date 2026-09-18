import { useEffect, useLayoutEffect } from 'react'

// Avoid layout-effect warnings during SSR; synchronize before paint in the browser.
export const useBrowserLayoutEffect =
	typeof window === 'undefined' ? useEffect : useLayoutEffect
