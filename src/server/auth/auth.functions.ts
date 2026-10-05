import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import type { Database } from '#/db'
import { env } from '#/env'
import type { Access } from '#/lib/access'
import { getLocale } from '#/paraglide/runtime.js'
import { savedLocale } from '../account/account.server'
import { setLocaleCookie } from '../locale-cookie.server'
import { databaseMiddleware } from '../middleware'
import { landingOrganization, memberships } from '../organizations/organizations.server'
import { auth } from './better-auth.server'
import { signInOptions } from './sign-in.server'

export const getSignInOptions = createServerFn({ method: 'GET' }).handler(() => signInOptions(env))

export type SignInOptions = Awaited<ReturnType<typeof getSignInOptions>>

// The signed-in user with their memberships and saved locale, or null when signed out. A
// saved locale that differs from the request's goes into the cookie, so the user's choice
// wins in a browser that had another one (src/lib/locale.ts renders the page again in it).
async function signedIn(db: Database) {
  const session = await auth.api.getSession({ headers: getRequestHeaders() })
  if (!session) return null
  const [organizations, locale] = await Promise.all([
    memberships(db, session.user.id),
    savedLocale(db, session.user.id),
  ])
  if (locale && locale !== getLocale()) setLocaleCookie(locale)
  return { session, organizations, locale }
}

export const getAccess = createServerFn({ method: 'GET' })
  .middleware([databaseMiddleware])
  .handler(async ({ context }): Promise<Access> => {
    const state = await signedIn(context.db)
    if (!state) return { signedIn: false, organization: null, locale: null }
    const { session, organizations, locale } = state
    const opens = landingOrganization(organizations, session.session.activeOrganizationId)
    return { signedIn: true, organization: opens?.slug ?? null, locale }
  })

// What the app frame shows: the user, and the organizations they can switch between.
// Null when signed out.
export const getFrame = createServerFn({ method: 'GET' })
  .middleware([databaseMiddleware])
  .handler(async ({ context }) => {
    const state = await signedIn(context.db)
    if (!state) return null
    const { session, organizations, locale } = state
    return { user: { name: session.user.name, email: session.user.email }, organizations, locale }
  })

export type Frame = NonNullable<Awaited<ReturnType<typeof getFrame>>>
