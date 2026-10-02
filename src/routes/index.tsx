import { createFileRoute, redirect } from '@tanstack/react-router'
import { HomePage } from '#/features/home/home-page'
import { landing } from '#/lib/access'
import { followSavedLocale } from '#/lib/locale'
import { getAccess } from '#/server/auth/auth.functions'

export const Route = createFileRoute('/')({
  beforeLoad: async ({ location }) => {
    const access = await getAccess()
    followSavedLocale(access.locale, location.href)
    const to = landing(access)
    if (to !== '/') throw redirect({ to })
  },
  component: HomePage,
})
