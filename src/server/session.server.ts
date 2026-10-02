import type { createAuth } from './auth/better-auth.server'
import { AppError } from './errors'

// The signed-in user's ID, or UNAUTHENTICATED. sessionMiddleware calls it with the
// request's headers; tests call it with their own auth instance.
export async function sessionUserId(
  auth: ReturnType<typeof createAuth>,
  headers: Headers,
): Promise<string> {
  const session = await auth.api.getSession({ headers })
  if (!session) throw new AppError('UNAUTHENTICATED', 'sign_in_required')
  return session.user.id
}
