/// <reference types="bun" />

import { requestHandler } from '@tanstack/react-start/server'
import { mock } from 'bun:test'
import type { AsyncLocalStorage } from 'node:async_hooks'
import type { Database } from '#/db'
import { SEED_PASSWORD } from '#/db/seed'
import { paraglideMiddleware } from '#/paraglide/server.js'
import type { createAuth } from './auth/better-auth.server'

// What a call rejected with, or null when it resolved: tests then match the AppError's
// code and key.
export function rejection(run: Promise<unknown>): Promise<unknown> {
  return run.then(
    () => null,
    (reason: unknown) => reason,
  )
}

// Points the server functions' middleware at a test database and auth instance. Bun shares
// modules between test files, so call the returned function in afterAll to put the app's
// own back.
export async function useTestServer(db: Database, auth: ReturnType<typeof createAuth>) {
  const app = { ...(await import('#/db')) }
  const appAuth = { ...(await import('./auth/better-auth.server')) }
  await mock.module('#/db', () => ({ ...app, db }))
  await mock.module('#/server/auth/better-auth.server', () => ({ ...appAuth, auth }))
  return async () => {
    await mock.module('#/db', () => app)
    await mock.module('#/server/auth/better-auth.server', () => appAuth)
  }
}

// Start's internals for running a server function on the server; no public API runs one
// outside a real request. A Start upgrade that changes them makes callServerFn throw.
type ServerFn = {
  __executeServer?: (opts: {
    data: unknown
    method: string
    context: object
  }) => Promise<{ result: unknown; error: unknown }>
}

const startStorage: AsyncLocalStorage<object> | undefined = Reflect.get(
  globalThis,
  Symbol.for('tanstack-start:start-storage-context'),
)

// Calls a server function the way the server does for a request with these headers: in the
// request's locale (src/server-entry.ts), through the function's middleware chain and
// validators. Returns what the handler returned or threw, and the response, which carries
// the cookies it set. The handler runs because src/test/bun-preload.ts registers it.
export async function callServerFn(
  fn: unknown,
  { data, headers = new Headers() }: { data?: unknown; headers?: Headers } = {},
) {
  const execute = (fn as ServerFn).__executeServer
  if (!execute || !startStorage) throw new Error('Start internals changed; update callServerFn.')
  let outcome: { result: unknown; error: unknown } = { result: undefined, error: undefined }
  const handle = requestHandler(async (request) => {
    const context = { request, startOptions: {}, contextAfterGlobalMiddlewares: {} }
    outcome = await startStorage.run(context, () => execute({ data, method: 'POST', context: {} }))
    return new Response(null)
  })
  const request = new Request('http://localhost:3000/_serverFn/test', { method: 'POST', headers })
  const response = await paraglideMiddleware(request, () => handle(request, undefined))
  return { ...outcome, response }
}

// Request headers with a session cookie for a seeded user, signed in through auth.
export async function signedIn(auth: ReturnType<typeof createAuth>, email: string) {
  const response = await auth.api.signInEmail({
    body: { email, password: SEED_PASSWORD },
    asResponse: true,
  })
  return new Headers({ cookie: response.headers.get('set-cookie') ?? '' })
}
