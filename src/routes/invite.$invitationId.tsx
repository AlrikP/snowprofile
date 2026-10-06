import { createFileRoute, redirect } from '@tanstack/react-router'
import { InvitationPage, InvitationPending } from '#/features/invitation/invitation-page'
import { errorMessage } from '#/lib/errors'
import { getAccess } from '#/server/auth/auth.functions'
import { acceptInvitation } from '#/server/invitations/invitations.functions'

// An invitation link. Signed out, it goes through sign-in and back; signed in, it accepts
// the invitation and opens its organization (docs/architecture.md, "Roles").
export const Route = createFileRoute('/invite/$invitationId')({
  beforeLoad: async ({ location }) => {
    const access = await getAccess()
    if (!access.signedIn) throw redirect({ to: '/sign-in', search: { redirect: location.href } })
  },
  loader: async ({ params }) => {
    const accepted = await acceptInvitation({ data: { invitationId: params.invitationId } }).then(
      (result) => ({ ok: true as const, organization: result.organization }),
      (error: unknown) => ({ ok: false as const, message: errorMessage(error) }),
    )
    if (!accepted.ok) return { message: accepted.message }
    throw redirect({ to: '/$organization', params: { organization: accepted.organization } })
  },
  pendingComponent: InvitationPending,
  component: InvitationRoute,
})

function InvitationRoute() {
  const { message } = Route.useLoaderData()
  return <InvitationPage message={message} />
}
