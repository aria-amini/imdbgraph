import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import { update } from '@/lib/imdb/scraper.ts'

import { serverEnv as env } from '../src/env.server.ts'

const db = drizzle({
	client: new Pool({
		connectionString: env.DATABASE_URL,
	}),
})

async function populateDb() {
	console.log('Starting DB population...')

	try {
		await update(db)
		console.log('DB population completed successfully.')
	} catch (e) {
		console.error('DB population failed:', e)
		process.exit(1)
	}

	process.exit(0)
}

await populateDb()
