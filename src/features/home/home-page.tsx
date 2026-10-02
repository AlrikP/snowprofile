import { Link } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'
import { authClient } from '#/lib/auth-client'
import { m } from '#/paraglide/messages.js'

// A placeholder home that shows who is signed in; task 012 replaces it with the app frame.
export function HomePage() {
  const { data: session, isPending, refetch } = authClient.useSession()

  if (isPending) return null

  return (
    <main className="flex flex-col items-start gap-4 p-8">
      <h1 className="text-2xl font-semibold">{m.app_name()}</h1>
      {session ? (
        <>
          <p>{m.home_signed_in_as({ name: session.user.name, email: session.user.email })}</p>
          <Button
            variant="outline"
            onClick={async () => {
              await authClient.signOut()
              await refetch()
            }}
          >
            {m.sign_out()}
          </Button>
        </>
      ) : (
        <Link to="/sign-in" className="underline">
          {m.sign_in_submit()}
        </Link>
      )}
    </main>
  )
}
