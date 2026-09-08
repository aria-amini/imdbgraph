import { drizzle } from 'drizzle-orm/node-postgres'
import type { PoolClient } from 'pg'
import { Pool } from 'pg'

import { update } from '@/lib/imdb/scraper.ts'

import { serverEnv as env } from '../src/env.server.ts'

const SEED_LOCK_KEY = 'imdbgraph:seed-if-empty'

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

async function seedIfEmpty() {
	console.log('Checking whether the database needs seeding...')
	const client = await pool.connect()

	try {
		await client.query('SELECT pg_advisory_lock(hashtext($1));', [
			SEED_LOCK_KEY,
		])

		// Re-check after acquiring the lock: a concurrent deploy may have
		// populated the database while this deploy waited.
		if (await isPopulated(client)) {
			console.log('Database already populated. Skipping seed.')
			return
		}

		console.log('Database is empty. Seeding from IMDb datasets...')
		await update(db)
	} finally {
		try {
			await client.query('SELECT pg_advisory_unlock(hashtext($1));', [
				SEED_LOCK_KEY,
			])
		} finally {
			client.release()
		}
	}
}

try {
	await seedIfEmpty()
} catch (error) {
	console.error('Seeding failed:', error)
	process.exit(1)
}

await pool.end()
