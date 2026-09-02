import { createServerOnlyFn } from '@tanstack/react-start'
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

export const createDb = createServerOnlyFn(() => {
	return drizzle({
		client: getPool(),
	})
})
