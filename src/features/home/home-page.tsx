import { Link } from '@tanstack/react-router'
import { Button } from '#/components/ui/button'
import { authClient } from '#/lib/auth-client'

// A placeholder home that shows who is signed in; task 012 replaces it with the app frame.
export function HomePage() {
  const { data: session, isPending, refetch } = authClient.useSession()

  if (isPending) return null

  return (
    <main className="flex flex-col items-start gap-4 p-8">
      <h1 className="text-2xl font-semibold">snowprofile</h1>
      {session ? (
        <>
          <p>
            Signed in as {session.user.name} ({session.user.email}).
          </p>
          <Button
            variant="outline"
            onClick={async () => {
              await authClient.signOut()
              await refetch()
            }}
          >
            Sign out
          </Button>
        </>
      ) : (
        <Link to="/sign-in" className="underline">
          Sign in
        </Link>
      )}
    </main>
  )
}
