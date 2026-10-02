/// <reference types="bun" />

import { expect, test } from 'bun:test'
import { AppError, errorMessages } from '#/server/errors'
import { errorMessage } from './errors'

test('message keys are snake_case, so they can name translated messages', () => {
  for (const key of Object.keys(errorMessages)) expect(key).toMatch(/^[a-z]+(_[a-z]+)*$/)
})

test('an AppError carries its code and key, and shows its message', () => {
  const error = new AppError('CONFLICT', 'update_request_open')
  expect(error).toMatchObject({ code: 'CONFLICT', key: 'update_request_open' })
  // Outside a request, messages are in the base locale, Estonian.
  expect(errorMessage(error)).toBe('Sellel profiilil on juba avatud uuendamise palve.')
})

test('any other error shows a generic message, not its internals', () => {
  expect(errorMessage(new Error('SQLITE_CONSTRAINT: UNIQUE constraint failed'))).toBe(
    'Midagi läks valesti. Proovi uuesti.',
  )
})
