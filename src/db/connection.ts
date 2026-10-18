import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import { serverEnv as env } from '@/env.server'

let pool: Pool | undefined

function getPool() {
	pool ??= new Pool({
		connectionString: env.DATABASE_URL,
	})

	return pool
}

/**
 * Creates a Drizzle database client backed by the application pool.
 *
 * Not wrapped in `createServerOnlyFn`: the populate script imports this module
 * in plain Node, where `@tanstack/solid-start` cannot load. The `env.server`
 * import keeps the module out of client bundles through import protection.
 */
export function createDb() {
	return drizzle({
		client: getPool(),
	})
}
