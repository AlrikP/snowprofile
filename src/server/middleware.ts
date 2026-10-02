// Middleware for server functions. A function picks one: sessionMiddleware for calls about
// the signed-in user, scopeMiddleware for calls on an organization's data.
import { createMiddleware } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { db } from '#/db'
import { withActor } from '#/db/actor'
import { auth } from './auth/better-auth.server'
import { parseOrganizationInput } from './schemas'
import { resolveScope } from './scope.server'
import { sessionUserId } from './session.server'

// A signed-in user, as context.userId. The call's database writes run as that user.
export const sessionMiddleware = createMiddleware({ type: 'function' }).server(async ({ next }) => {
  const userId = await sessionUserId(auth, getRequestHeaders())
  return withActor(userId, () => next({ context: { userId } }))
})

// The organization the call names, checked against the user's memberships, as
// context.scope. The organization comes from the call's input, not the session's active
// organization, so a tab keeps acting in its own organization after another tab switches
// (docs/architecture.md, "Tenancy"). Start merges this validator's input type into the
// function's, so every scoped call passes organizationId.
export const scopeMiddleware = createMiddleware({ type: 'function' })
  .middleware([sessionMiddleware])
  // Start runs this on the raw input before the function's own schema, which parses the
  // rest, so it checks organizationId and returns the input whole.
  .validator((input: { organizationId: string }) => parseOrganizationInput(input))
  .server(async ({ next, context, data }) =>
    next({ context: { scope: await resolveScope(db, context.userId, data.organizationId) } }),
  )
