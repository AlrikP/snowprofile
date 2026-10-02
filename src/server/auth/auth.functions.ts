import { createServerFn } from '@tanstack/react-start'
import { env } from '#/env'
import { signInOptions } from './sign-in.server'

export const getSignInOptions = createServerFn({ method: 'GET' }).handler(() => signInOptions(env))

export type SignInOptions = Awaited<ReturnType<typeof getSignInOptions>>
