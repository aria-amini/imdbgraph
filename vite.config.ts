import { resolve } from 'node:path'

import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { varlockVitePlugin } from '@varlock/vite-integration'
import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig, type UserConfig } from 'vite-plus'
import { playwright } from 'vite-plus/test/browser-playwright'

const root = import.meta.dirname

const fmt = {
	singleQuote: true,
	semi: false,
	useTabs: true,
	experimentalTailwindcss: {},
	experimentalSortImports: {},
	printWidth: 80,
	experimentalSortPackageJson: false,
	proseWrap: 'always',
	ignorePatterns: [
		'**/.output',
		'**/.vite',
		'**/dist/**',
		'pnpm-lock.yaml',
		'env.d.ts',
		'**/routeTree.gen.ts',
		'src/db/migrations/**',
	],
	overrides: [{ files: ['*.{yaml,yml}'], options: { useTabs: false } }],
} satisfies UserConfig['fmt']

const lint = {
	plugins: [
		'eslint',
		'unicorn',
		'typescript',
		'oxc',
		'react',
		'react-perf',
		'import',
		'jsdoc',
		'jsx-a11y',
		'node',
		'promise',
	],
	categories: {},
	options: { typeAware: true, typeCheck: true },
	rules: {
		'no-empty-pattern': 'off',
		'no-console': ['error', { allow: ['warn', 'error'] }],
	},
	overrides: [
		{
			files: [
				'scripts/**',
				'src/lib/imdb/file-downloader.ts',
				'src/lib/imdb/scraper.ts',
				'**/*.server.ts',
			],
			rules: { 'no-console': 'off' },
		},
	],
	env: { builtin: true },
	globals: {},
	ignorePatterns: ['**/dist/**'],
} satisfies UserConfig['lint']

export default defineConfig({
	root,
	server: { host: '0.0.0.0', port: Number(process.env.APP_PORT ?? 3000) },
	resolve: {
		tsconfigPaths: true,
		dedupe: ['react', 'react-dom'],
		alias: [
			{ find: '@config', replacement: resolve(root, 'config') },
			{ find: '@/mocks', replacement: resolve(root, '__mocks__') },
			{ find: '@', replacement: resolve(root, 'src') },
			{ find: '@tests', replacement: resolve(root, 'tests') },
		],
	},
	plugins: [
		tanstackStart({
			router: { routeFileIgnorePattern: '(\\.test\\.tsx$|__screenshots__)' },
		}),
		...(process.env.VITEST === 'true'
			? []
			: [
					devtools({ injectSource: { enabled: false } }),
					nitro({ sourcemap: true, experimental: { sourcemapMinify: false } }),
				]),
		tailwindcss(),
		viteReact(),
		babel({ presets: [reactCompilerPreset()] }),
		varlockVitePlugin({ ssrInjectMode: 'resolved-env' }),
	],
	fmt,
	lint,
	staged: { '*.{js,ts,tsx}': 'vp check --fix' },
	test: {
		projects: [
			{ extends: true, test: { name: 'unit', include: ['src/**/*.test.unit.ts'] } },
			{
				extends: true,
				test: {
					name: 'server',
					include: ['src/**/*.test.ts'],
					testTimeout: 30_000,
					fileParallelism: false,
				},
			},
			{
				extends: true,
				test: {
					name: 'browser',
					include: ['src/**/*.test.tsx', 'tests/**/*.test.tsx'],
					setupFiles: ['./src/styles.css'],
					browser: {
						instances: [{ browser: 'chromium' }],
						provider: playwright({
							launchOptions: { args: ['--disable-lcd-text'] },
						}),
						enabled: true,
						headless: true,
					},
				},
			},
		],
	},
	ssr: { noExternal: ['recharts'] },
})
