import type { ErrorComponentProps } from '@tanstack/react-router'
import { errorMessage } from '#/lib/errors'

// What a page shows when its loader or render fails: the error's message in the UI
// language, such as "Project not found." for a deleted project, in place of the page.
export function RouteError({ error }: ErrorComponentProps) {
  return (
    <main className="p-4 md:p-8">
      <p role="alert" className="text-muted-foreground">
        {errorMessage(error)}
      </p>
    </main>
  )
}
