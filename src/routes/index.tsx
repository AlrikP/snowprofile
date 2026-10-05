import { createFileRoute } from '@tanstack/react-router'
import { redirectToLanding } from '#/lib/access'
import { followSavedLocale } from '#/lib/locale'
import { getAccess } from '#/server/auth/auth.functions'

export const Route = createFileRoute('/')({
  beforeLoad: async ({ location }) => {
    const access = await getAccess()
    followSavedLocale(access.locale, location.href)
    throw redirectToLanding(access)
  },
})
