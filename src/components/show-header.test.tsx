import { expect, test } from '@config/test/browser'
import { http, HttpResponse } from 'msw'
import { render } from 'vitest-browser-react'

import { ShowHeader } from '@/components/show-header'
import { gameOfThronesRatings } from '@/mocks/data/game-of-thrones'

test('loads the next show poster after the previous poster failed', async ({
	worker,
}) => {
	const nextRatings = {
		...gameOfThronesRatings,
		show: {
			...gameOfThronesRatings.show,
			imdbId: 'tt9999999',
			title: 'Next show',
		},
	}
	worker.use(
		http.get('/api/thumbnails/:imdbId', ({ params }) => {
			if (params.imdbId !== nextRatings.show.imdbId) {
				return new HttpResponse(null, { status: 404 })
			}
			return new HttpResponse(
				'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="30"><rect width="20" height="30" fill="blue"/></svg>',
				{ headers: { 'Content-Type': 'image/svg+xml' } },
			)
		}),
	)
	const screen = await render(<ShowHeader ratings={gameOfThronesRatings} />)
	await expect
		.element(screen.getByText('Poster unavailable'))
		.toBeInTheDocument()

	await screen.rerender(<ShowHeader ratings={nextRatings} />)

	const poster = screen.getByRole('img', { name: 'Next show poster' })
	await expect.element(poster).toBeVisible()
	await expect
		.poll(() => {
			const image = poster.element()
			return image instanceof HTMLImageElement ? image.naturalWidth : 0
		})
		.toBeGreaterThan(0)
	await expect
		.element(screen.getByText('Poster unavailable'))
		.not.toBeInTheDocument()
})
