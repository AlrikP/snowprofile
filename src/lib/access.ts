import type { Locale } from '#/paraglide/runtime.js'

// Where a visitor belongs: signed out, signed in without a membership, or in the app. The
// routes redirect from the server's answer (getAccess) with this one rule. locale is the
// UI language the user saved, if any.
export type Access = {
  signedIn: boolean
  hasOrganization: boolean
  locale: Locale | null
}

export type Landing = '/sign-in' | '/no-access' | '/'

export function landing(access: Pick<Access, 'signedIn' | 'hasOrganization'>): Landing {
  if (!access.signedIn) return '/sign-in'
  return access.hasOrganization ? '/' : '/no-access'
}
