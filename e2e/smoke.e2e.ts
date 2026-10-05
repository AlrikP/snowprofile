import { expect, test } from '@playwright/test'
import { inEnglish, session } from './sessions'

test('the health endpoint reports the app and its database up', async ({ request }) => {
  const response = await request.get('/api/health')

  expect(response.status()).toBe(200)
  expect(await response.json()).toEqual({ status: 'ok' })
})

test('a signed-out visitor gets the sign-in page with the demo accounts', async ({
  page,
  context,
}) => {
  await inEnglish(context)
  await page.goto('/demo/projects')

  await expect(page).toHaveURL(/\/sign-in$/)
  await expect(page.getByRole('heading', { name: 'Sign in to snowprofile' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Demo version' })).toContainText(
    'admin@demo.example.com',
  )
})

// These open organization pages by URL, not through /: switching organization changes
// which one / opens, and the setup project already checks where sign-in lands.
test.describe('the admin', () => {
  test.use({ storageState: session.admin })

  test('sees every section', async ({ page }) => {
    await page.goto('/demo/profile')

    await expect(page.getByRole('heading', { name: 'My profile' })).toBeVisible()
    const work = page.getByRole('navigation', { name: 'Work' })
    await expect(work.getByRole('link')).toHaveText(['Projects', 'People', 'Search', 'CVs'])
  })

  test('switches to their other organization', async ({ page }) => {
    await page.goto('/demo/profile')

    await page.getByRole('button', { name: /Switch organization/ }).click()
    await page.getByRole('menuitemradio', { name: /Rabasaare Digital/ }).click()

    await expect(page).toHaveURL(/\/rabasaare\/profile$/)
  })
})

test.describe('the employee', () => {
  test.use({ storageState: session.employee })

  test('sees only their own sections', async ({ page }) => {
    await page.goto('/demo/profile')

    await expect(page.getByRole('complementary').getByRole('link')).toHaveText([
      'My profile',
      'Projects',
      'Technologies',
    ])
  })
})
