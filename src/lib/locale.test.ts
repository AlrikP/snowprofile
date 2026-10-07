/// <reference types="bun" />

import { isRedirect } from '@tanstack/react-router'
import { expect, test } from 'bun:test'
import { cookieName, extractLocaleFromRequest } from '#/paraglide/runtime.js'
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

test('ui-languages.browser-default: the cookie, then the browser’s language, then Estonian', () => {
  function localeOf(headers: Record<string, string>) {
    return extractLocaleFromRequest(new Request('https://cv.example.com/sign-in', { headers }))
  }
  expect(localeOf({ 'accept-language': 'en-GB,en;q=0.9' })).toBe('en')
  expect(localeOf({ 'accept-language': 'de-DE,de;q=0.9' })).toBe('et')
  expect(localeOf({})).toBe('et')
  expect(localeOf({ 'accept-language': 'en', cookie: `${cookieName}=et` })).toBe('et')
})
