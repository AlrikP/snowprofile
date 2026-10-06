// The frame, with the member's role, loads once per organization. When an admin changes
// that role, or removes the member, the next server call answers FORBIDDEN. Reloading the
// route loaders then fetches the frame again, so the navigation and the page guards follow
// the new role without a full page reload.
import type { QueryClient } from '@tanstack/react-query'
import { AppError } from '#/server/errors'

// A FORBIDDEN that persists after a reload, such as a page the role still can't use, must
// not reload again and again.
const QUIET_MS = 10_000

function isForbidden(error: unknown) {
  return error instanceof AppError && error.code === 'FORBIDDEN'
}

export function reloadOnForbidden(
  queryClient: QueryClient,
  reload: () => Promise<unknown>,
  now: () => number = Date.now,
) {
  let quietUntil = 0
  function onError(error: unknown) {
    if (!isForbidden(error) || now() < quietUntil) return
    quietUntil = now() + QUIET_MS
    void reload()
  }
  const unsubscribeQueries = queryClient.getQueryCache().subscribe((event) => {
    if (event.type === 'updated' && event.action.type === 'error') onError(event.action.error)
  })
  const unsubscribeMutations = queryClient.getMutationCache().subscribe((event) => {
    if (event.type === 'updated' && event.action.type === 'error') onError(event.action.error)
  })
  return () => {
    unsubscribeQueries()
    unsubscribeMutations()
  }
}
