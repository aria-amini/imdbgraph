import { resolve } from 'node:path'

import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { sql } from 'drizzle-orm'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import { test as baseTest } from 'vite-plus/test'

import { REQUIRED_EXTENSIONS } from '@/db/extensions'

type Database = NodePgDatabase & { $client: Pool }

type Seed = (db: Database) => Promise<void> | void

/** Creates one migrated database per test file, shared by its tests. */
export function initDb(seed?: Seed) {
	return baseTest.extend<{ db: Database }>({
		db: [
			async ({}, use) => {
				const container = await new PostgreSqlContainer('postgres:17').start()

				try {
					const client = new Pool({
						connectionString: container.getConnectionUri(),
					})

					// Postgres terminates pooled connections on container stop;
					// without a listener those errors become uncaught exceptions
					// that fail the whole run despite passing tests.
					client.on('error', (err) => {
						console.error('test pg pool error:', err.message)
					})

					try {
						const db = drizzle({ client })

						for (const extension of REQUIRED_EXTENSIONS) {
							await db.execute(
								sql`CREATE EXTENSION IF NOT EXISTS ${sql.raw(extension)}`,
							)
						}

						await migrate(db, {
							migrationsFolder: resolve(
								import.meta.dirname,
								'../../src/db/migrations',
							),
						})
						await seed?.(db)
						await use(db)
					} finally {
						await client.end()
					}
				} finally {
					await container.stop()
				}
			},
			{ scope: 'file' },
		],
	})
}
