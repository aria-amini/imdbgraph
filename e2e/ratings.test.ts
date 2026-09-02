import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
	await page.goto('/')
})

test('Ratings route displays Avatar ratings', async ({ page }) => {
	await page.goto('/ratings/tt0417299')
	await expect(
		page.getByRole('heading', { name: 'Avatar: The Last Airbender' }),
	).toBeVisible()
})

test('Ratings route handles an unpopulated database', async ({ page }) => {
	await page.goto('/ratings/tt0000000')
	await expect(page).toHaveURL(/.*\/ratings\/tt0000000/)
	await expect(page.getByText('Not Found')).toBeVisible()
})
