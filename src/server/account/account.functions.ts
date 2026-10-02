// Account server functions. Thin wrappers: the rules live in account.server.ts.
import { createServerFn } from '@tanstack/react-start'
import { setLocaleCookie } from '../locale-cookie.server'
import { sessionMiddleware } from '../middleware'
import { SaveLocaleInput } from './account.schemas'
import * as account from './account.server'

// Keeps the chosen UI language on the user and in the cookie.
export const saveLocale = createServerFn({ method: 'POST' })
  .middleware([sessionMiddleware])
  .validator(SaveLocaleInput)
  .handler(async ({ data, context }) => {
    const saved = await account.saveLocale(context.db, context.userId, data)
    setLocaleCookie(saved.locale)
    return saved
  })
