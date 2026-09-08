import { drizzle } from 'drizzle-orm/node-postgres'
import type { PoolClient } from 'pg'
import { Pool } from 'pg'

import { update } from '@/lib/imdb/scraper.ts'

import { serverEnv as env } from '../src/env.server.ts'

const IF_EMPTY = process.argv.includes('--if-empty')
const LOCK_KEY = 'imdbgraph:populate'

const pool = new Pool({
	connectionString: env.DATABASE_URL,
})
const db = drizzle({ client: pool })

async function isPopulated(client: PoolClient): Promise<boolean> {
	const reg = await client.query<{ reg: string | null }>(
		'SELECT to_regclass($1) AS reg;',
		['public.scrape_run'],
	)
	if (!reg.rows[0]?.reg) {
		return false
	}

	const result = await client.query('SELECT 1 FROM scrape_run LIMIT 1;')
	return (result.rowCount ?? 0) > 0
}

async function populateDb() {
	console.log('Starting DB population...')

	const lockClient = IF_EMPTY ? await pool.connect() : null
	try {
		if (lockClient) {
			await lockClient.query('SELECT pg_advisory_lock(hashtext($1));', [
				LOCK_KEY,
			])

			// Re-check after the lock: a concurrent run may have populated
			// the database while this one waited.
			if (await isPopulated(lockClient)) {
				console.log('Database already populated. Skipping.')
				return
			}
		}

		await update(db)
		console.log('DB population completed successfully.')
	} finally {
		if (lockClient) {
			try {
				await lockClient.query('SELECT pg_advisory_unlock(hashtext($1));', [
					LOCK_KEY,
				])
			} finally {
				lockClient.release()
			}
		}
		await pool.end()
	}
}

try {
	await populateDb()
} catch (e) {
	console.error('DB population failed:', e)
	process.exit(1)
}

process.exit(0)
