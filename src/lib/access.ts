import { redirect } from '@tanstack/react-router'
import type { Locale } from '#/paraglide/runtime.js'

// Where a visitor belongs: signed out, signed in without a membership, or in the app. The
// routes redirect from the server's answer (getAccess) with this one rule. organization is
// the slug of the organization the app opens in; locale is the UI language the user saved,
// if any.
export type Access = {
  signedIn: boolean
  organization: string | null
  locale: Locale | null
}

export type Landing = '/sign-in' | '/no-access' | '/$organization'

export function landing(access: Pick<Access, 'signedIn' | 'organization'>): Landing {
  if (!access.signedIn) return '/sign-in'
  return access.organization ? '/$organization' : '/no-access'
}

// The redirect to where the visitor belongs.
export function redirectToLanding(access: Pick<Access, 'signedIn' | 'organization'>) {
  if (access.signedIn && access.organization) {
    return redirect({ to: '/$organization', params: { organization: access.organization } })
  }
  return redirect({ to: landing(access) === '/no-access' ? '/no-access' : '/sign-in' })
}
