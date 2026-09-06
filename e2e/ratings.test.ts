import { expect, test } from '@playwright/test'

test('Ratings route handles an unknown show', async ({ page }) => {
	await page.goto('/ratings/tt0000000')
	await expect(page).toHaveURL(/.*\/ratings\/tt0000000/)
	await expect(
		page.getByRole('heading', { name: 'Page not found' }),
	).toBeVisible()
})
