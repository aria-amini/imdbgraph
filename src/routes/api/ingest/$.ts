import { createFileRoute } from '@tanstack/react-router'

const posthogApiHost = 'https://us.i.posthog.com'
const posthogAssetsHost = 'https://us-assets.i.posthog.com'

const hopByHopHeaders = new Set([
	'connection',
	'content-encoding',
	'content-length',
	'keep-alive',
	'transfer-encoding',
	'upgrade',
])

async function proxyPosthogRequest({
	request,
	params,
}: {
	request: Request
	params: { _splat?: string }
}) {
	const path = params._splat ?? ''
	const requestUrl = new URL(request.url)
	const upstreamHost = path.startsWith('static/')
		? posthogAssetsHost
		: posthogApiHost
	const upstreamUrl = new URL(path, `${upstreamHost}/`)
	upstreamUrl.search = requestUrl.search

	const headers = new Headers(request.headers)
	headers.delete('host')
	headers.delete('connection')

	const requestInit: RequestInit & { duplex: 'half' } = {
		method: request.method,
		headers,
		body:
			request.method === 'GET' || request.method === 'HEAD'
				? null
				: request.body,
		duplex: 'half',
	}
	const response = await fetch(upstreamUrl, requestInit)

	const responseHeaders = new Headers(response.headers)
	for (const header of hopByHopHeaders) responseHeaders.delete(header)

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: responseHeaders,
	})
}

export const Route = createFileRoute('/api/ingest/$')({
	server: {
		handlers: {
			GET: proxyPosthogRequest,
			POST: proxyPosthogRequest,
			PUT: proxyPosthogRequest,
			PATCH: proxyPosthogRequest,
			DELETE: proxyPosthogRequest,
			OPTIONS: proxyPosthogRequest,
			HEAD: proxyPosthogRequest,
		},
	},
})
