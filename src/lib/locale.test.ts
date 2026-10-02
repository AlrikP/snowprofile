/// <reference types="bun" />

import { isRedirect } from '@tanstack/react-router'
import { expect, test } from 'bun:test'
import { followSavedLocale } from './locale'

// bun test runs as the server, outside a request, so the page's locale is the base, et.
function outcome(saved: 'et' | 'en' | null) {
  try {
    followSavedLocale(saved, '/no-access?from=sign-in')
    return 'stays'
  } catch (error) {
    return isRedirect(error) ? error.options.href : error
  }
}

test('a saved locale that differs renders the same page again', () => {
  expect(outcome('en')).toBe('/no-access?from=sign-in')
})

test('a matching or missing saved locale leaves the page as it is', () => {
  expect(outcome('et')).toBe('stays')
  expect(outcome(null)).toBe('stays')
})
