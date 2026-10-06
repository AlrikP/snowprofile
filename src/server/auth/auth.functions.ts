import { createServerFn } from '@tanstack/react-start'
import { env } from '#/env'
import { databaseMiddleware } from '../middleware'
import { access, frame } from './session.server'
import { signInOptions } from './sign-in.server'

export const getSignInOptions = createServerFn({ method: 'GET' }).handler(() => signInOptions(env))

export type SignInOptions = Awaited<ReturnType<typeof getSignInOptions>>

export const getAccess = createServerFn({ method: 'GET' })
  .middleware([databaseMiddleware])
  .handler(({ context }) => access(context.db))

export const getFrame = createServerFn({ method: 'GET' })
  .middleware([databaseMiddleware])
  .handler(({ context }) => frame(context.db))

export type Frame = NonNullable<Awaited<ReturnType<typeof getFrame>>>
export type Membership = Frame['organizations'][number]
