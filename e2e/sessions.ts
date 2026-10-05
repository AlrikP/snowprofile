import { type BrowserContext, expect, type Page } from '@playwright/test'
import { SEED_PASSWORD, seedUsers } from '#/db/seed-accounts'
import { cookieName } from '#/paraglide/runtime.js'
import { E2E_PORT } from './server'

type Role = (typeof seedUsers)[number]['role']

// Where the setup project saves each seeded role's signed-in session.
export const session: Record<Role, string> = {
  admin: 'e2e/.auth/admin.json',
  employee: 'e2e/.auth/employee.json',
}

// Tests read the UI in English; Estonian is the default.
export function inEnglish(context: BrowserContext) {
  return context.addCookies([
    { name: cookieName, value: 'en', url: `http://localhost:${E2E_PORT}` },
  ])
}

// Signs in a seeded user through the sign-in page, in English.
export async function signIn(page: Page, role: Role) {
  const user = seedUsers.find((each) => each.role === role)
  if (!user) throw new Error(`no seeded ${role}`)
  await inEnglish(page.context())
  await page.goto('/')
  await expect(page).toHaveURL(/\/sign-in$/)

  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill(SEED_PASSWORD)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()

  await expect(page).toHaveURL(/\/demo\/profile$/)
}
