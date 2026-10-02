import { createFileRoute } from '@tanstack/react-router'
import * as v from 'valibot'
import { SignInPage, SignInPending } from '#/features/sign-in/sign-in-page'
import { getSignInOptions } from '#/server/auth/auth.functions'

// Better Auth sends a failed Google sign-in back here with an error code.
const SearchSchema = v.object({ error: v.optional(v.string()) })

export const Route = createFileRoute('/sign-in')({
  validateSearch: SearchSchema,
  loader: () => getSignInOptions(),
  pendingComponent: SignInPending,
  component: SignInRoute,
})

function SignInRoute() {
  const options = Route.useLoaderData()
  const { error } = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <SignInPage
      options={options}
      initialError={error}
      onSignedIn={() => void navigate({ to: '/' })}
    />
  )
}
