import { expect, test } from '@playwright/test'

const avatarSuggestion = {
	imdbId: 'tt0417299',
	title: 'Avatar: The Last Airbender',
	startYear: '2005',
	endYear: '2008',
	rating: 9.3,
	numVotes: 411_000,
}

test.beforeEach(async ({ page }) => {
	await page.route('**/api/suggestions**', async (route) => {
		await route.fulfill({ json: [avatarSuggestion] })
	})
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
	const option = page.getByRole('option', {
		name: /Avatar: The Last Airbender/,
	})
	await expect(option).toBeVisible()
	await option.click()
	await expect(page).toHaveURL(/\/ratings\/tt0417299$/)
})

test('Search bar keyboard navigation works', async ({ page }) => {
	await expect(
		page.getByRole('heading', { name: /IMDbGraph\.org/i }),
	).toBeVisible()
	const searchBar = page.getByRole('combobox')
	await expect(searchBar).not.toBeDisabled({ timeout: 15_000 })
	await searchBar.click()
	await searchBar.fill('Avatar')
	await searchBar.press('ArrowDown')
	await searchBar.press('Enter')
	await expect(page).toHaveURL(/\/ratings\/tt0417299$/)
})
