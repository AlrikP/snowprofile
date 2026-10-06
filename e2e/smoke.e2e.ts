import { expect, test } from '@playwright/test'
import { SEED_PASSWORD } from '#/db/seed-accounts'
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

  test('search.make-cv: finds people by a technology and opens a CV of them', async ({ page }) => {
    await page.goto('/demo/search')
    await page.getByRole('combobox', { name: 'Add a technology from the catalogue' }).fill('java')
    await page
      .getByRole('option', { name: /^Java\b/ })
      .first()
      .click()

    await expect(page).toHaveURL(/[?&]t=/)
    await expect(page.getByRole('status')).toContainText(/\d+ (person|people)/)
    await page.getByRole('link', { name: /Make CV \(\d+\)/ }).click()
    await expect(page).toHaveURL(/\/demo\/cvs\?.*people=/)
    await expect(page.getByRole('region', { name: 'Preview' })).toBeVisible()
  })

  test('technical-characteristics.admin-reorders: a move survives a reload', async ({ page }) => {
    await page.goto('/demo/criteria')
    const names = page.getByRole('listitem').locator('span.font-medium')
    const [first, second] = await names.allTextContents()
    if (!first || !second) throw new Error('expected seeded characteristics')

    await page.getByRole('button', { name: `Move ${second} up` }).click()
    await expect(names.first()).toHaveText(second)
    await page.reload()

    await expect(names.nth(0)).toHaveText(second)
    await expect(names.nth(1)).toHaveText(first)
  })

  test('projects.admin-edits: creates a project, then renames it', async ({ page }) => {
    await page.goto('/demo/projects')
    await page.getByRole('link', { name: 'Add project' }).click()

    await page.getByLabel('Name').fill('E2E projekt')
    await page.getByRole('group', { name: 'Start' }).getByLabel('Year').fill('2018')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('E2E projekt')

    await page.getByRole('link', { name: 'Edit project' }).click()
    await page.getByLabel('Name').fill('E2E projekt, muudetud')
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('E2E projekt, muudetud')
    await expect(page.getByText(/^Last changed .* by Anna Admin$/)).toBeVisible()
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

  test('employee-profile.education-added: an added entry survives a reload', async ({ page }) => {
    await page.goto('/demo/profile')
    const education = page.getByRole('region', { name: 'Education' })

    await education.getByRole('button', { name: 'Add' }).click()
    const dialog = page.getByRole('dialog')
    await dialog
      .getByRole('group', { name: 'Institution' })
      .getByLabel('In Estonian')
      .fill('E2E Akadeemia')
    await dialog.getByRole('button', { name: 'Save' }).click()
    await expect(education).toContainText('E2E Akadeemia')
    await page.reload()

    await expect(education).toContainText('E2E Akadeemia')
  })

  test('project-participation.added: opens their participation from the project page', async ({
    page,
  }) => {
    await page.goto('/demo/projects')
    await page.getByRole('checkbox', { name: 'Only my projects' }).click()
    await page.getByRole('row').nth(1).getByRole('link').first().click()
    await page.getByRole('link', { name: 'Edit my participation' }).first().click()

    await expect(page).toHaveURL(/\/demo\/profile\?participation=/)
    await expect(page.getByRole('dialog', { name: 'Participation in a project' })).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page).toHaveURL(/\/demo\/profile$/)
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

  test('technical-characteristics.employee-refused: the checklist page sends them to their profile', async ({
    page,
  }) => {
    await page.goto('/demo/criteria')

    await expect(page).toHaveURL(/\/demo\/profile$/)
  })

  test('cv-selection.employee-refused: the CV page sends them to their profile', async ({
    page,
  }) => {
    await page.goto('/demo/cvs')

    await expect(page).toHaveURL(/\/demo\/profile$/)
  })

  test('role-catalogue.employee-cannot-curate: the roles page sends them to their profile', async ({
    page,
  }) => {
    await page.goto('/demo/roles')

    await expect(page).toHaveURL(/\/demo\/profile$/)
  })

  test('projects.details-hidden: a project they didn’t take part in hides its tender details', async ({
    page,
  }) => {
    await page.goto('/demo/projects')
    const notMine = page.getByRole('row').filter({ hasNot: page.getByText('You took part') })
    await notMine.nth(1).getByRole('link').click()

    await expect(page).toHaveURL(/\/demo\/projects\/[0-9a-f-]+$/)
    await expect(page.getByText(/see the tender details and contact persons/)).toBeVisible()
    await expect(page.getByRole('region', { name: 'Tender details' })).toHaveCount(0)
  })
})

// Last in the file, so the employee tests above run with the employee's own role.
test('members-and-roles.role-change-applied: a demoted member loses the admin pages without a reload', async ({
  browser,
}) => {
  const adminContext = await browser.newContext({ storageState: session.admin })
  const employeeContext = await browser.newContext({ storageState: session.employee })
  const admin = await adminContext.newPage()
  const employee = await employeeContext.newPage()
  async function setErikRole(role: 'Admin' | 'Employee') {
    await admin.goto('/demo/members')
    await admin.getByRole('button', { name: 'Actions for Erik Employee' }).click()
    await admin.getByRole('menuitemradio', { name: role }).click()
    await expect(admin.getByRole('row', { name: /Erik Employee/ })).toContainText(role)
  }

  await setErikRole('Admin')
  await employee.goto('/demo/profile')
  const criteria = employee.getByRole('link', { name: 'Technical characteristics' })
  await expect(criteria).toBeVisible()

  await setErikRole('Employee')
  await criteria.click()

  await expect(employee).toHaveURL(/\/demo\/profile$/)
  await expect(employee.getByRole('link', { name: 'Technical characteristics' })).toHaveCount(0)
  await adminContext.close()
  await employeeContext.close()
})

test('members-and-roles.invitation-accepted: an invited person opens the link signed out, signs in, and joins', async ({
  browser,
}) => {
  const adminContext = await browser.newContext({ storageState: session.admin })
  const admin = await adminContext.newPage()
  await admin.goto('/rabasaare/members')
  await admin.getByRole('button', { name: 'Invite member' }).click()
  await admin.getByLabel('Email').fill('employee@demo.example.com')
  await admin.getByRole('button', { name: 'Create invitation link' }).click()
  const link = await admin.getByRole('textbox', { name: 'Invitation link' }).inputValue()
  expect(link).toMatch(/\/invite\/[0-9a-f-]+$/)

  const visitorContext = await browser.newContext()
  await inEnglish(visitorContext)
  const visitor = await visitorContext.newPage()
  await visitor.goto(link)
  await expect(visitor).toHaveURL(/\/sign-in\?redirect=/)
  await visitor.getByLabel('Email').fill('employee@demo.example.com')
  await visitor.getByLabel('Password').fill(SEED_PASSWORD)
  await visitor.getByRole('button', { name: 'Sign in', exact: true }).click()

  await expect(visitor).toHaveURL(/\/rabasaare\/profile$/)
  await expect(visitor.getByRole('heading', { name: 'My profile' })).toBeVisible()
  await admin.reload()
  await expect(admin.getByRole('row', { name: /Erik Employee/ })).toContainText('Employee')
  await adminContext.close()
  await visitorContext.close()
})

test('profile-update-requests.confirmed: a requested update shows as a notice until the employee confirms', async ({
  browser,
}) => {
  const adminContext = await browser.newContext({ storageState: session.admin })
  const employeeContext = await browser.newContext({ storageState: session.employee })
  const admin = await adminContext.newPage()
  const employee = await employeeContext.newPage()

  await admin.goto('/demo/people')
  await admin.getByRole('button', { name: 'Actions for Erik Employee' }).click()
  const request = admin.getByRole('menuitem', { name: 'Request an update' })
  if (await request.isVisible()) {
    await request.click()
    await admin.getByLabel('Message (optional)').fill('Lisa 2026. aasta projektid.')
    await admin.getByRole('button', { name: 'Send request' }).click()
  } else {
    await admin.keyboard.press('Escape')
  }
  await expect(admin.getByRole('row', { name: /Erik Employee/ })).toContainText('Sent')

  await employee.goto('/demo/projects')
  await employee.getByRole('link', { name: 'Open my profile' }).click()
  await expect(employee).toHaveURL(/\/demo\/profile$/)
  await expect(employee.getByText('Please review your profile')).toBeVisible()
  await employee.getByRole('button', { name: 'Profile is up to date' }).click()
  await expect(employee.getByText('Thanks! Your profile is confirmed.')).toBeVisible()

  await employee.getByRole('link', { name: 'Projects' }).first().click()
  await expect(employee.getByRole('link', { name: 'Open my profile' })).toHaveCount(0)
  await admin.reload()
  await expect(admin.getByRole('row', { name: /Erik Employee/ })).not.toContainText('Sent')
  await adminContext.close()
  await employeeContext.close()
})
