import 'varlock/auto-load'
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'

import { REQUIRED_EXTENSIONS } from '../src/db/extensions'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const db = drizzle({ client: pool })

async function main() {
	console.log('Running migrations...')
	try {
		for (const extension of REQUIRED_EXTENSIONS) {
			await db.execute(
				sql`CREATE EXTENSION IF NOT EXISTS ${sql.raw(extension)}`,
			)
		}
		await migrate(db, { migrationsFolder: 'src/db/migrations' })
		console.log('Migrations complete.')
	} catch (error) {
		console.error('Migration failed:', error)
		process.exitCode = 1
	} finally {
		await pool.end()
	}
}

void main()
