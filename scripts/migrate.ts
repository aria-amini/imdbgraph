import { resolve } from 'node:path'

import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'

import { REQUIRED_EXTENSIONS } from '../src/db/extensions'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const db = drizzle({ client: pool })

try {
	for (const extension of REQUIRED_EXTENSIONS) {
		await db.execute(sql`CREATE EXTENSION IF NOT EXISTS ${sql.raw(extension)}`)
	}

	await migrate(db, {
		migrationsFolder: resolve(import.meta.dirname, '../src/db/migrations'),
	})
	console.log('Migrations complete.')
} finally {
	await pool.end()
}
