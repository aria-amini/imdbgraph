import { resolve } from 'node:path'

import { defineToolkit } from '@aamini/config/tanstack'
import { tanstackStart } from '@tanstack/solid-start/plugin/vite'
import solid from 'vite-plugin-solid'

const root = import.meta.dirname

// Solid libraries ship JSX sources under the `solid` export condition. Node
// cannot load them, so the Node test projects must transform them.
const solidPackages = [/@tanstack\/solid-/, /solid-js/]

export default defineToolkit({
	root,
	// The toolkit wires the React variants of these plugins. Solid replaces
	// them below, so the toolkit must not load them.
	plugins: { tanstackStart: false, react: false, reactCompiler: false },
	tests: {
		unit: {
			include: ['src/**/*.unit.test.ts', 'src/**/*.test.unit.ts'],
			server: { deps: { inline: solidPackages } },
		},
		server: {
			include: ['src/**/*.test.ts'],
			server: { deps: { inline: solidPackages } },
		},
	},
	config: {
		// The Start plugin must run before the Solid plugin.
		plugins: (toolkitPlugins) => [
			tanstackStart({
				router: { routeFileIgnorePattern: '(\\.test\\.tsx$|__screenshots__)' },
				server: { build: { inlineCss: true } },
			}),
			...toolkitPlugins,
			solid({ ssr: true }),
		],
		resolve: {
			alias: [{ find: '@/mocks', replacement: resolve(root, '__mocks__') }],
		},
		optimizeDeps: { include: ['vitest-browser-solid'] },
		fmt: {
			ignorePatterns: ['src/db/migrations/**'],
		},
		lint: {
			// The toolkit lints for React. The React and React Compiler rules
			// misreport Solid components.
			plugins: (plugins) =>
				plugins.filter(
					(plugin) => plugin !== 'react' && plugin !== 'react-perf',
				),
			rules: {
				// Solid assigns `let` variables through `ref={...}`.
				'no-unassigned-vars': 'off',
				'eslint-js/no-restricted-syntax': [
					'error',
					{
						selector: 'JSXAttribute[name.name="class"] TemplateLiteral',
						message:
							'Do not build class with template literals. Use cn() from "cn" instead.',
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
