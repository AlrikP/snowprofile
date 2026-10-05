import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { AppFrame, AppFramePending } from '#/features/app-frame/app-frame'
import { authClient } from '#/lib/auth-client'
import { followSavedLocale } from '#/lib/locale'
import { saveLocale } from '#/server/account/account.functions'
import { getFrame } from '#/server/auth/auth.functions'

// Every signed-in page sits under its organization's slug, so each tab keeps its own
// organization (docs/architecture.md, "Tenancy"). The frame loads once per organization:
// its pages get it from this route's loader data.
export const Route = createFileRoute('/$organization')({
  loader: async ({ params, location }) => {
    const frame = await getFrame()
    if (!frame) throw redirect({ to: '/sign-in' })
    followSavedLocale(frame.locale, location.href)
    const organization = frame.organizations.find((each) => each.slug === params.organization)
    if (!organization) throw redirect({ to: '/' })
    return { frame, organization }
  },
  staleTime: Infinity,
  pendingComponent: AppFramePending,
  component: OrganizationLayout,
})

function OrganizationLayout() {
  const { frame, organization } = Route.useLoaderData()
  const navigate = Route.useNavigate()
  return (
    <AppFrame
      frame={frame}
      organization={organization}
      onSwitchOrganization={async (next) => {
        // The active organization only decides where the app opens after sign-in.
        await authClient.organization.setActive({ organizationId: next.id })
        await navigate({ to: '/$organization', params: { organization: next.slug } })
      }}
      saveLocale={(locale) => saveLocale({ data: { locale } })}
      onSignOut={async () => {
        await authClient.signOut()
        await navigate({ to: '/sign-in' })
      }}
    >
      <Outlet />
    </AppFrame>
  )
}
