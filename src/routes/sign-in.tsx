import { createFileRoute } from '@tanstack/react-router'
import * as v from 'valibot'
import { SignInPage, SignInPending } from '#/features/sign-in/sign-in-page'
import { getSignInOptions } from '#/server/auth/auth.functions'

// Better Auth sends a failed Google sign-in back here with an error code. A page that needs
// sign-in, such as an invitation link, sends its own path as redirect; only paths on this
// site are followed.
const SearchSchema = v.object({
  error: v.optional(v.string()),
  redirect: v.optional(
    v.pipe(
      v.string(),
      v.check((path) => path.startsWith('/') && !path.startsWith('//')),
    ),
  ),
})

export const Route = createFileRoute('/sign-in')({
  validateSearch: SearchSchema,
  loader: () => getSignInOptions(),
  pendingComponent: SignInPending,
  component: SignInRoute,
})

function SignInRoute() {
  const options = Route.useLoaderData()
  const { error, redirect } = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <SignInPage
      options={options}
      initialError={error}
      callbackURL={redirect ?? '/'}
      onSignedIn={() => void navigate(redirect ? { href: redirect } : { to: '/' })}
    />
  )
}
