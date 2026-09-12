import { afterEach, describe, expect, test, vi } from 'vitest'

import { fetchShowEnrichment } from '@/lib/images/tvmaze'

const posterUrl =
	'https://static.tvmaze.com/uploads/images/original_untouched/1.jpg'
const payload = {
	image: { original: posterUrl },
	status: 'Ended',
	network: { name: 'HBO' },
	schedule: { days: ['Monday'], time: ' 21:00 ' },
}

afterEach(() => vi.restoreAllMocks())

describe('TVmaze enrichment', () => {
	test('resolves the documented lookup redirect and normalizes metadata', async () => {
		const fetch = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValueOnce(
				new Response(null, {
					status: 301,
					headers: { location: 'https://api.tvmaze.com/shows/82' },
				}),
			)
			.mockResolvedValueOnce(Response.json(payload))
		expect(await fetchShowEnrichment('tt0944947')).toEqual({
			posterUrl,
			status: 'Ended',
			network: 'HBO',
			airsDays: ['Monday'],
			airsTime: '21:00',
		})
		expect(fetch).toHaveBeenNthCalledWith(
			1,
			'https://api.tvmaze.com/lookup/shows?imdb=tt0944947',
			expect.objectContaining({ redirect: 'manual' }),
		)
		expect(fetch).toHaveBeenNthCalledWith(
			2,
			new URL('https://api.tvmaze.com/shows/82'),
			expect.objectContaining({ redirect: 'error' }),
		)
	})

	test.each([
		'http://static.tvmaze.com/poster.jpg',
		'https://static.tvmaze.com.attacker.test/poster.jpg',
		'https://127.0.0.1/poster.jpg',
		'https://static.tvmaze.com@attacker.test/poster.jpg',
		'https://user:pass@static.tvmaze.com/poster.jpg',
		'https://static.tvmaze.com:8443/poster.jpg',
		'file:///etc/passwd',
	])('rejects an unsafe poster URL: %s', async (url) => {
		const fetch = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValue(Response.json({ image: { original: url } }))
		await expect(fetchShowEnrichment('tt0944947')).rejects.toThrow('poster URL')
		expect(fetch).toHaveBeenCalledTimes(1)
	})

	test.each([
		'http://api.tvmaze.com/shows/82',
		'https://attacker.test/shows/82',
		'https://api.tvmaze.com/lookup/shows?imdb=tt0944947',
		'https://user:pass@api.tvmaze.com/shows/82',
		'',
	])('rejects an unsafe lookup redirect: %s', async (location) => {
		const fetch = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValue(
				new Response(null, { status: 301, headers: { location } }),
			)
		await expect(fetchShowEnrichment('tt0944947')).rejects.toThrow(
			'lookup redirect',
		)
		expect(fetch).toHaveBeenCalledTimes(1)
	})

	test('returns null for a missing show', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(null, { status: 404 }),
		)
		expect(await fetchShowEnrichment('tt0944947')).toBeNull()
	})
})
