/// <reference types="bun" />

import { expect, test } from 'bun:test'
import { landing } from './access'

test('a signed-out visitor goes to sign-in', () => {
  expect(landing({ signedIn: false, hasOrganization: false })).toBe('/sign-in')
})

test('a signed-in user without a membership goes to the no-access page', () => {
  expect(landing({ signedIn: true, hasOrganization: false })).toBe('/no-access')
})

test('a member goes to the app', () => {
  expect(landing({ signedIn: true, hasOrganization: true })).toBe('/')
})
