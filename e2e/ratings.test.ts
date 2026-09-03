import { expect, test } from '@playwright/test'

test('Ratings route handles an unpopulated database', async ({ page }) => {
	await page.goto('/ratings/tt0000000')
	await expect(page).toHaveURL(/.*\/ratings\/tt0000000/)
	await expect(page.getByText('Not Found')).toBeVisible()
})
