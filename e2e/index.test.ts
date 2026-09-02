import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
	await page.goto('/')
})

test('Search bar click navigation works', async ({ page }) => {
	await expect(
		page.getByRole('heading', { name: /IMDbGraph\.org/i }),
	).toBeVisible()
	const searchBar = page.getByRole('combobox')
	await expect(searchBar).not.toBeDisabled({ timeout: 15_000 })
	await searchBar.click()
	await searchBar.fill('Avatar')
	await expect(searchBar).toHaveValue('Avatar')
})

test('Search bar keyboard navigation works', async ({ page }) => {
	await expect(
		page.getByRole('heading', { name: /IMDbGraph\.org/i }),
	).toBeVisible()
	const searchBar = page.getByRole('combobox')
	await expect(searchBar).not.toBeDisabled({ timeout: 15_000 })
	await searchBar.click()
	await searchBar.fill('Avatar')
	await searchBar.press('Escape')
	await expect(searchBar).toHaveValue('Avatar')
})
