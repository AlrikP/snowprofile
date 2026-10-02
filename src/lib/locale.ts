import { redirect } from '@tanstack/react-router'
import { getLocale, isServer, type Locale, setLocale } from '#/paraglide/runtime.js'

// Renders the page again in the user's saved locale when it differs from the one this
// page rendered in. getAccess has already put it in the cookie: on the server a redirect to
// the same address renders in it; in the browser Paraglide's setLocale reloads the page.
export function followSavedLocale(saved: Locale | null, href: string) {
  if (!saved || saved === getLocale()) return
  if (isServer) throw redirect({ href })
  void setLocale(saved)
}
