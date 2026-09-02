import { QueryClientProvider } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'

import { queryClient } from '@/lib/react-query'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

// Create a new router instance
export const getRouter = () => {
	return createRouter({
		routeTree,
		scrollRestoration: true,
		defaultPreloadStaleTime: 0,
		context: {
			queryClient,
		},
		Wrap: ({ children }) => {
			return (
				<QueryClientProvider client={queryClient}>
					{children}
				</QueryClientProvider>
			)
		},
	})
}
