import { initDb } from '@config/test/db'
import { describe, expect } from 'vitest'

import { show } from '@/db/tables'
import { fetchSuggestions } from '@/lib/imdb/search'

import { shows } from './__fixtures__/shows'

const test = initDb(async (db) => {
	await db.insert(show).values(shows)
})

describe('search tests', () => {
	test('exact title', async ({ db }) => {
		const results = await fetchSuggestions(db, 'Game of Thrones')
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
		const results = await fetchSuggestions(db, 'breaking')
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
		const results = await fetchSuggestions(db, 'strnger thgs')
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
		const results = await fetchSuggestions(db, 'NonExistentShow')
		expect(results).toHaveLength(0)
	})

	test('generic search', async ({ db }) => {
		const results = await fetchSuggestions(db, 'The')
		expect(results).toMatchInlineSnapshot(`
			[
			  {
			    "endYear": "2022",
			    "imdbId": "tt1520211",
			    "numVotes": 1150592,
			    "rating": 8.1,
			    "startYear": "2010",
			    "title": "The Walking Dead",
			  },
			  {
			    "endYear": "2019",
			    "imdbId": "tt0898266",
			    "numVotes": 912870,
			    "rating": 8.1,
			    "startYear": "2007",
			    "title": "The Big Bang Theory",
			  },
			  {
			    "endYear": null,
			    "imdbId": "tt1190634",
			    "numVotes": 788118,
			    "rating": 8.6,
			    "startYear": "2019",
			    "title": "The Boys",
			  },
			  {
			    "endYear": "2013",
			    "imdbId": "tt0386676",
			    "numVotes": 783172,
			    "rating": 9,
			    "startYear": "2005",
			    "title": "The Office",
			  },
			  {
			    "endYear": null,
			    "imdbId": "tt3581920",
			    "numVotes": 682762,
			    "rating": 8.6,
			    "startYear": "2023",
			    "title": "The Last of Us",
			  },
			]
		`)
	})
})
