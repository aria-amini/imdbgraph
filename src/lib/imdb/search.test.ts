import { initDb } from '@config/test/db'
import { describe, expect } from 'vitest'

import { show } from '@/db/tables'

import { shows } from './__fixtures__/shows'
import { searchShows } from './search'

const test = initDb(async (db) => {
	await db.insert(show).values(shows)
})

describe('search tests', () => {
	test('exact title', async ({ db }) => {
		const results = await searchShows(db, 'Game of Thrones')
		expect(results[0]).toEqual({
			title: 'Game of Thrones',
			imdbId: 'tt0944947',
			startYear: '2011',
			endYear: '2019',
			rating: 9.2,
			numVotes: 2453952,
		})
	})

	test('prefix search', async ({ db }) => {
		const results = await searchShows(db, 'breaking')
		expect(results[0]).toEqual({
			title: 'Breaking Bad',
			imdbId: 'tt0903747',
			startYear: '2008',
			endYear: '2013',
			rating: 9.5,
			numVotes: 2358716,
		})
	})

	test.skip('handling typos', async ({ db }) => {
		const results = await searchShows(db, 'strnger thgs')
		expect(results[0]).toEqual({
			title: 'Stranger Things',
			imdbId: 'tt4574334',
			startYear: '2016',
			endYear: '2025',
			rating: 8.6,
			numVotes: 1462384,
		})
	})

	test('non-existent results', async ({ db }) => {
		const results = await searchShows(db, 'NonExistentShow')
		expect(results).toHaveLength(0)
	})

	test('generic search returns matches ordered by votes', async ({ db }) => {
		const results = await searchShows(db, 'The')
		expect(results.slice(0, 3).map((result) => result.title)).toEqual([
			'The Walking Dead',
			'The Big Bang Theory',
			'The Boys',
		])
		const votes = results.map((result) => result.numVotes)
		expect(votes).toEqual([...votes].sort((a, b) => b - a))
	})

	test('limits results to the 50 most-voted matches', async ({ db }) => {
		await db.insert(show).values(
			Array.from({ length: 51 }, (_, index) => ({
				imdbId: `tt${9000000 + index}`,
				title: `Limitprobe ${index}`,
				startYear: '2020',
				numVotes: index,
			})),
		)
		const results = await searchShows(db, 'Limitprobe')
		expect(results).toHaveLength(50)
		expect(results.map((result) => result.numVotes)).toEqual(
			Array.from({ length: 50 }, (_, index) => 50 - index),
		)
	})
})
