/// <reference types="bun" />

import { QueryClient } from '@tanstack/react-query'
import { describe, expect, test } from 'bun:test'
import { AppError } from '#/server/errors'
import { reloadOnForbidden } from './forbidden-reload'

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  let time = 0
  let reloads = 0
  reloadOnForbidden(
    queryClient,
    async () => {
      reloads += 1
    },
    () => time,
  )
  function fail(error: unknown, key = String(Math.random())) {
    return queryClient
      .fetchQuery({
        queryKey: [key],
        queryFn: () => Promise.reject(error),
      })
      .catch(() => undefined)
  }
  return {
    queryClient,
    fail,
    reloads: () => reloads,
    later: (ms: number) => {
      time += ms
    },
  }
}

describe('reloadOnForbidden', () => {
  test('members-and-roles.role-change-applied: a FORBIDDEN answer reloads the frame and its guards', async () => {
    const { fail, reloads } = setup()

    await fail(new AppError('FORBIDDEN', 'criterion_forbidden'))
    expect(reloads()).toBe(1)
  })

  test('reloads once while the FORBIDDEN answers continue, and again later', async () => {
    const { fail, reloads, later } = setup()

    await fail(new AppError('FORBIDDEN', 'member_forbidden'))
    await fail(new AppError('FORBIDDEN', 'member_forbidden'))
    expect(reloads()).toBe(1)
    later(11_000)
    await fail(new AppError('FORBIDDEN', 'member_forbidden'))
    expect(reloads()).toBe(2)
  })

  test('ignores other errors, and reacts to a refused write too', async () => {
    const { queryClient, fail, reloads } = setup()

    await fail(new AppError('NOT_FOUND', 'project_not_found'))
    await fail(new Error('network'))
    expect(reloads()).toBe(0)
    await queryClient
      .getMutationCache()
      .build(queryClient, {
        mutationFn: () => Promise.reject(new AppError('FORBIDDEN', 'project_forbidden')),
      })
      .execute(undefined)
      .catch(() => undefined)
    expect(reloads()).toBe(1)
  })
})
