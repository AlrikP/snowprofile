import { createFileRoute, redirect } from '@tanstack/react-router'
import { NoAccessPage } from '#/features/no-access/no-access-page'
import { landing } from '#/lib/access'
import { getAccess } from '#/server/auth/auth.functions'

export const Route = createFileRoute('/no-access')({
  beforeLoad: async () => {
    const to = landing(await getAccess())
    if (to !== '/no-access') throw redirect({ to })
  },
  component: NoAccessRoute,
})

function NoAccessRoute() {
  const navigate = Route.useNavigate()
  return <NoAccessPage onSignedOut={() => void navigate({ to: '/sign-in' })} />
}
