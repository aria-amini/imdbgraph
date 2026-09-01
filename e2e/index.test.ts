import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
	await page.goto('/')
})

test('Search bar click navigation works', async ({ page }) => {
	await expect(page.getByRole('heading', { name: /IMDB Graph/i })).toBeVisible()
	const searchBar = page.getByRole('combobox')
	await expect(searchBar).not.toBeDisabled({ timeout: 15_000 })
	await searchBar.click()
	await searchBar.fill('Avatar')
	const avatarDropdownOption = page.getByText(
		'Avatar: The Last Airbender 2005 - 2008',
	)
	await expect(avatarDropdownOption).toBeVisible()
	await avatarDropdownOption.click()
	await expect(page).toHaveURL(/.*\/ratings\/tt0417299/)
})

test('Search bar keyboard navigation works', async ({ page }) => {
	await expect(page.getByRole('heading', { name: /IMDB Graph/i })).toBeVisible()
	const searchBar = page.getByRole('combobox')
	await expect(searchBar).not.toBeDisabled({ timeout: 15_000 })
	await searchBar.click()
	await searchBar.fill('Avatar')
	await expect(
		page.getByText('Avatar: The Last Airbender 2005 - 2008'),
	).toBeVisible()
	await searchBar.press('Enter')
	await expect(page).toHaveURL(/.*\/ratings\/tt0417299/)
})
