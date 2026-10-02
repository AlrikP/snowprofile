import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { env } from '#/env'
import type { Access } from '#/lib/access'
import { auth } from './better-auth.server'
import { signInOptions } from './sign-in.server'

export const getSignInOptions = createServerFn({ method: 'GET' }).handler(() => signInOptions(env))

export type SignInOptions = Awaited<ReturnType<typeof getSignInOptions>>

// Memberships come from Better Auth, which reads only the signed-in user's own.
export const getAccess = createServerFn({ method: 'GET' }).handler(async (): Promise<Access> => {
  const headers = getRequestHeaders()
  const session = await auth.api.getSession({ headers })
  if (!session) return { signedIn: false, hasOrganization: false }
  const organizations = await auth.api.listOrganizations({ headers })
  return { signedIn: true, hasOrganization: organizations.length > 0 }
})
