import { createFileRoute } from '@tanstack/react-router'
import { NoAccessPage } from '#/features/no-access/no-access-page'
import { landing, redirectToLanding } from '#/lib/access'
import { followSavedLocale } from '#/lib/locale'
import { getAccess } from '#/server/auth/auth.functions'

export const Route = createFileRoute('/no-access')({
  beforeLoad: async ({ location }) => {
    const access = await getAccess()
    followSavedLocale(access.locale, location.href)
    if (landing(access) !== '/no-access') throw redirectToLanding(access)
  },
  component: NoAccessRoute,
})

function NoAccessRoute() {
  const navigate = Route.useNavigate()
  return <NoAccessPage onSignedOut={() => void navigate({ to: '/sign-in' })} />
}
