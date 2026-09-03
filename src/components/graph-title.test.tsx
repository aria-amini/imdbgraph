import { test } from '@config/test/browser'
import { expect } from 'vite-plus/test'
import { render } from 'vitest-browser-react'

import { gameOfThronesRatings } from '@/mocks/data/game-of-thrones'

import { Graph } from './graph'

test('graph displays show title', async () => {
	const screen = await render(
		<div className="dark bg-background min-h-screen p-6">
			<Graph ratings={gameOfThronesRatings} />
		</div>,
	)

	await expect
		.element(screen.getByRole('heading', { name: 'Game of Thrones' }))
		.toBeVisible()
})
