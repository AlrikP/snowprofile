/// <reference types="bun" />

import { expect, test } from 'bun:test'
import { landing } from './access'

test('a signed-out visitor goes to sign-in', () => {
  expect(landing({ signedIn: false, organization: null })).toBe('/sign-in')
})

test('a signed-in user without a membership goes to the no-access page', () => {
  expect(landing({ signedIn: true, organization: null })).toBe('/no-access')
})

test('a member goes to their organization', () => {
  expect(landing({ signedIn: true, organization: 'demo' })).toBe('/$organization')
})
