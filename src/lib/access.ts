// Where a visitor belongs: signed out, signed in without a membership, or in the app. The
// routes redirect from the server's answer (getAccess) with this one rule.
export type Access = { signedIn: boolean; hasOrganization: boolean }

export type Landing = '/sign-in' | '/no-access' | '/'

export function landing(access: Access): Landing {
  if (!access.signedIn) return '/sign-in'
  return access.hasOrganization ? '/' : '/no-access'
}
