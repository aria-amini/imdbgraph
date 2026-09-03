import { defineConfig, devices } from '@playwright/test'

const baseURL =
	process.env.BASE_URL ?? `http://localhost:${process.env.APP_PORT ?? '3000'}`

export default defineConfig({
	testDir: './e2e',
	outputDir: '.playwright/test-results',
	fullyParallel: true,
	workers: process.env.CI ? 1 : '50%',
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 3 : 0,
	reporter: [['html', { open: 'never', outputFolder: '.playwright/report' }]],
	use: {
		baseURL,
		ignoreHTTPSErrors: !process.env.CI && baseURL.startsWith('https://'),
		trace: 'retain-on-first-failure',
		screenshot: 'on',
		video: 'retain-on-failure',
	},
	timeout: 15_000,
	expect: { timeout: 5_000 },
	projects: [
		{
			name: 'chromium',
			use: {
				...devices['Desktop Chrome'],
				launchOptions: { args: ['--disable-lcd-text'] },
			},
		},
		{
			name: 'mobile',
			use: {
				...devices['Desktop Chrome'],
				viewport: { width: 320, height: 800 },
				launchOptions: { args: ['--disable-lcd-text'] },
			},
		},
	],
})
