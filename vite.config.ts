import { resolve } from 'node:path'

import { defineToolkit } from '@aamini/config/tanstack'

const root = import.meta.dirname

export default defineToolkit({
	root,
	tests: {
		unit: { include: ['src/**/*.unit.test.ts', 'src/**/*.test.unit.ts'] },
		server: { include: ['src/**/*.test.ts'] },
	},
	config: {
		resolve: {
			alias: [{ find: '@/mocks', replacement: resolve(root, '__mocks__') }],
		},
		fmt: {
			ignorePatterns: ['src/db/migrations/**'],
		},
		lint: {
			overrides: [
				{
					files: ['src/lib/imdb/scraper/**'],
					rules: { 'no-console': 'off' },
				},
			],
		},
	},
})
