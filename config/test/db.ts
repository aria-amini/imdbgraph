import { resolve } from 'node:path'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { Pool } from 'pg'
import { afterEach, beforeEach, describe, expect, test as baseTest, vi } from 'vite-plus/test'

type Database = NodePgDatabase & { $client: Pool }
let seedFunction: (db: Database) => Promise<void> | void = async () => {}

const test = baseTest.extend<{ db: Database }>({
	db: [
		async ({}, use) => {
			const { PostgreSqlContainer } = await import('@testcontainers/postgresql')
			const { drizzle } = await import('drizzle-orm/node-postgres')
			const { migrate } = await import('drizzle-orm/node-postgres/migrator')
			const { reset } = await import('drizzle-seed')
			const { Pool } = await import('pg')
			const container = await new PostgreSqlContainer('postgres:17').start()
			const client = new Pool({ connectionString: container.getConnectionUri() })
			const db = Object.assign(drizzle({ client }), { $client: client })
			try {
				const schemaPath = resolve(process.cwd(), 'src/db/tables.ts')
				await migrate(db, { migrationsFolder: resolve(process.cwd(), 'src/db/migrations') })
				await reset(db, await import(/* @vite-ignore */ schemaPath))
				await seedFunction(db)
				await use(db)
			} finally {
				await db.$client.end()
				await container.stop()
			}
		},
		{ scope: 'file' },
	],
})

export function initDb(seed: (db: Database) => Promise<void> | void) {
	seedFunction = seed
}

export { afterEach, beforeEach, describe, expect, test, vi }
