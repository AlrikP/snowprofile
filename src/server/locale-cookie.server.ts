import { setCookie } from '@tanstack/react-start/server'
import { cookieMaxAge, cookieName } from '#/paraglide/runtime.js'

// Sets Paraglide's locale cookie on the response, as its setLocale does in the browser, so
// the next page renders in the locale.
export function setLocaleCookie(locale: string) {
  setCookie(cookieName, locale, { path: '/', maxAge: cookieMaxAge, sameSite: 'lax' })
}
