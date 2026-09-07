import { useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'

/** Warms the ratings route chunk so the first show click skips its fetch. */
export function usePreloadRatingsChunk() {
	const router = useRouter()
	useEffect(() => {
		const route = router.looseRoutesById['/ratings/$id']
		if (route) void router.loadRouteChunk(route)
	}, [router])
}
