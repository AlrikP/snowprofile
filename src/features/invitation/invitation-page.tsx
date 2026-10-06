import { Link } from '@tanstack/react-router'
import { TriangleAlertIcon } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { m } from '#/paraglide/messages.js'

// Shown when an invitation link can't be accepted: expired, canceled, used, or for another
// address. A link that works leads straight into its organization instead.
export function InvitationPage({ message }: { message: string }) {
  return (
    <main className="mx-auto flex max-w-md flex-col items-start gap-4 p-8">
      <Alert>
        <TriangleAlertIcon />
        <AlertTitle>{m.invitation_failed_title()}</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
      <Button asChild variant="outline">
        <Link to="/">{m.invitation_go_home()}</Link>
      </Button>
    </main>
  )
}

export function InvitationPending() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 p-8" aria-busy="true">
      <p className="text-muted-foreground">{m.invitation_accepting()}</p>
    </main>
  )
}
