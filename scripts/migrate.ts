import { resolve } from 'node:path'

import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const db = drizzle({ client: pool })

try {
	await migrate(db, {
		migrationsFolder: resolve(import.meta.dirname, '../src/db/migrations'),
	})
	console.log('Migrations complete.')
} finally {
	await pool.end()
}
