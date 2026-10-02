import { createFileRoute, redirect } from '@tanstack/react-router'
import { HomePage } from '#/features/home/home-page'
import { landing } from '#/lib/access'
import { getAccess } from '#/server/auth/auth.functions'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const to = landing(await getAccess())
    if (to !== '/') throw redirect({ to })
  },
  component: HomePage,
})
