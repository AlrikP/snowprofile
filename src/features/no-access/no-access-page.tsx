import { Button } from '#/components/ui/button'
import { authClient } from '#/lib/auth-client'
import { m } from '#/paraglide/messages.js'

// For a signed-in user who belongs to no organization: nothing to show until an admin
// invites them.
export function NoAccessPage({ onSignedOut }: { onSignedOut: () => void }) {
  return (
    <main className="mx-auto flex max-w-md flex-col items-start gap-4 p-8">
      <h1 className="text-2xl font-semibold">{m.no_access_title()}</h1>
      <p>{m.no_access_body()}</p>
      <Button
        variant="outline"
        onClick={async () => {
          await authClient.signOut()
          onSignedOut()
        }}
      >
        {m.sign_out()}
      </Button>
    </main>
  )
}
