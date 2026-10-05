import { test as setup } from '@playwright/test'
import { session, signIn } from './sessions'

for (const role of ['admin', 'employee'] as const) {
  setup(`sign-in.demo-password: the seeded ${role} signs in`, async ({ page }) => {
    await signIn(page, role)
    await page.context().storageState({ path: session[role] })
  })
}
