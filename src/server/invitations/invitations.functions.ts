// Invitation server functions. Thin wrappers: the rules live in invitations.server.ts.
import { createServerFn } from '@tanstack/react-start'
import { scopeMiddleware, sessionMiddleware } from '../middleware'
import { CreateInvitationInput, InvitationInput } from './invitations.schemas'
import * as invitations from './invitations.server'

export const getPendingInvitations = createServerFn({ method: 'GET' })
  .middleware([scopeMiddleware])
  .handler(({ context }) => invitations.pendingInvitations(context.db, context.scope))

export const createInvitation = createServerFn({ method: 'POST' })
  .middleware([scopeMiddleware])
  .validator(CreateInvitationInput)
  .handler(({ data, context }) => invitations.createInvitation(context.db, context.scope, data))

export const cancelInvitation = createServerFn({ method: 'POST' })
  .middleware([scopeMiddleware])
  .validator(InvitationInput)
  .handler(({ data, context }) => invitations.cancelInvitation(context.db, context.scope, data))

// The invitee isn't a member yet, so this runs on the session alone.
export const acceptInvitation = createServerFn({ method: 'POST' })
  .middleware([sessionMiddleware])
  .validator(InvitationInput)
  .handler(({ data, context }) => invitations.acceptInvitation(context.db, context.userId, data))

export type PendingInvitation = Awaited<ReturnType<typeof getPendingInvitations>>[number]
