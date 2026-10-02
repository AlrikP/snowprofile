import { Button } from '#/components/ui/button'
import { authClient } from '#/lib/auth-client'

// For a signed-in user who belongs to no organization: nothing to show until an admin
// invites them.
export function NoAccessPage({ onSignedOut }: { onSignedOut: () => void }) {
  return (
    <main className="mx-auto flex max-w-md flex-col items-start gap-4 p-8">
      <h1 className="text-2xl font-semibold">No access yet</h1>
      <p>
        Your account isn&apos;t a member of any organization. Ask an organization admin for an
        invitation, then sign in again.
      </p>
      <Button
        variant="outline"
        onClick={async () => {
          await authClient.signOut()
          onSignedOut()
        }}
      >
        Sign out
      </Button>
    </main>
  )
}
