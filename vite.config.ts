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
			rules: {
				// The theme declares these utilities in @theme inline, but the rule
				// cannot resolve values declared that way, so they are allow-listed
				// by name.
				'shadcn/no-unknown-classes': [
					'error',
					{
						allow: [
							'text-2xs',
							'text-3xs',
							'text-4xs',
							'text-5xs',
							'leading-display',
							'animate-pending-slide',
						],
					},
				],
				'shadcn/no-restyle': [
					'error',
					{
						allow: ['layout'],
						contracts: [
							// Graph page: square-cornered chart surface and compact tooltip.
							{
								pattern: '^Card$',
								allow: [
									'layout',
									'spacing',
									'color',
									'border',
									'shadow',
									'shape',
									'effects',
								],
							},
							{ pattern: '^CardHeader$', allow: ['layout', 'spacing'] },
							{ pattern: '^CardTitle$', allow: ['layout', 'typography'] },
							{
								pattern: '^CardDescription$',
								allow: ['layout', 'typography'],
							},
							{ pattern: '^CardContent$', allow: ['layout', 'spacing'] },
							// Search bar composes the input group into a distinct look.
							{
								pattern: '^InputGroup$',
								allow: ['layout', 'color', 'effects', 'motion'],
							},
							{ pattern: '^InputGroupButton$', allow: ['layout', 'color'] },
							{ pattern: '^InputGroupAddon$', allow: ['layout', 'effects'] },
							// Retry uses the app's mono micro label treatment.
							{
								pattern: '^Button$',
								allow: [
									'layout',
									'font-mono',
									'text-2xs',
									'tracking-widest',
									'uppercase',
								],
							},
						],
					},
				],
			},
			overrides: [
				{
					files: ['src/lib/imdb/scraper/**'],
					rules: { 'no-console': 'off' },
				},
			],
		},
	},
})
