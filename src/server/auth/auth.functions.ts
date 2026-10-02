import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { env } from '#/env'
import type { Access } from '#/lib/access'
import { getLocale } from '#/paraglide/runtime.js'
import { savedLocale } from '../account/account.server'
import { setLocaleCookie } from '../locale-cookie.server'
import { databaseMiddleware } from '../middleware'
import { auth } from './better-auth.server'
import { signInOptions } from './sign-in.server'

export const getSignInOptions = createServerFn({ method: 'GET' }).handler(() => signInOptions(env))

export type SignInOptions = Awaited<ReturnType<typeof getSignInOptions>>

// Memberships come from Better Auth, which reads only the signed-in user's own. A saved
// locale that differs from the request's goes into the cookie, so the user's choice wins
// in a browser that had another one (src/lib/locale.ts renders the page again in it).
export const getAccess = createServerFn({ method: 'GET' })
  .middleware([databaseMiddleware])
  .handler(async ({ context }): Promise<Access> => {
    const headers = getRequestHeaders()
    const session = await auth.api.getSession({ headers })
    if (!session) return { signedIn: false, hasOrganization: false, locale: null }
    const [organizations, locale] = await Promise.all([
      auth.api.listOrganizations({ headers }),
      savedLocale(context.db, session.user.id),
    ])
    if (locale && locale !== getLocale()) setLocaleCookie(locale)
    return { signedIn: true, hasOrganization: organizations.length > 0, locale }
  })
