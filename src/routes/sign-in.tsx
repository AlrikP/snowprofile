import { createFileRoute } from '@tanstack/react-router'
import { SignInPage, SignInPending } from '#/features/sign-in/sign-in-page'
import { getSignInOptions } from '#/server/auth/auth.functions'

export const Route = createFileRoute('/sign-in')({
  loader: () => getSignInOptions(),
  pendingComponent: SignInPending,
  component: SignInRoute,
})

function SignInRoute() {
  const options = Route.useLoaderData()
  const navigate = Route.useNavigate()
  return <SignInPage options={options} onSignedIn={() => void navigate({ to: '/' })} />
}
