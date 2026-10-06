import { expect, test } from '@playwright/test'
import { inEnglish, session } from './sessions'

test('the health endpoint reports the app and its database up', async ({ request }) => {
  const response = await request.get('/api/health')

  expect(response.status()).toBe(200)
  expect(await response.json()).toEqual({ status: 'ok' })
})

test('sign-in.signed-out-redirected: a signed-out visitor gets the sign-in page with the demo accounts', async ({
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

  test('technology-catalogue.employee-adds: adds an entry on the technologies page', async ({
    page,
  }) => {
    await page.goto('/demo/technologies')
    await expect(page.getByRole('heading', { name: 'Technologies', level: 1 })).toBeVisible()

    await page.getByRole('button', { name: 'Add technology' }).click()
    const dialog = page.getByRole('dialog', { name: 'Add technology' })
    await dialog.getByLabel('Name').fill('Playwright Probe')
    await dialog.getByRole('button', { name: 'Save' }).click()

    await expect(dialog).toBeHidden()
    const added = page.getByRole('listitem').filter({ hasText: 'Playwright Probe' })
    await expect(added).toBeVisible()
    // Loaded again on the server, through the route's loader.
    await page.reload()
    await expect(added).toBeVisible()
  })
})
