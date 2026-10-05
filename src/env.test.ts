/// <reference types="bun" />

import { expect, test } from 'bun:test'
import { parseEnv } from '#/env'

const base = {
  BETTER_AUTH_SECRET: 'x'.repeat(32),
  BETTER_AUTH_URL: 'http://localhost:3000',
  DATABASE_URL: 'file:local.db',
}

test('DEMO_MODE defaults to on in development and test', () => {
  expect(parseEnv({ ...base, NODE_ENV: 'development' }).DEMO_MODE).toBe(true)
  expect(parseEnv({ ...base, NODE_ENV: 'test' }).DEMO_MODE).toBe(true)
})

test('DEMO_MODE defaults to off in production, and when NODE_ENV is unset', () => {
  expect(parseEnv({ ...base, NODE_ENV: 'production' }).DEMO_MODE).toBe(false)
  expect(parseEnv(base).DEMO_MODE).toBe(false)
})

test('an explicit DEMO_MODE wins over the default', () => {
  expect(parseEnv({ ...base, NODE_ENV: 'production', DEMO_MODE: 'true' }).DEMO_MODE).toBe(true)
  expect(parseEnv({ ...base, NODE_ENV: 'development', DEMO_MODE: 'false' }).DEMO_MODE).toBe(false)
})

test('DATABASE_URL must be a local file', () => {
  expect(() => parseEnv({ ...base, DATABASE_URL: 'libsql://remote.example.com' })).toThrow()
})

test('Google needs both its client ID and secret', () => {
  expect(() => parseEnv({ ...base, GOOGLE_CLIENT_ID: 'id' })).toThrow('GOOGLE_CLIENT_SECRET')
  const both = parseEnv({ ...base, GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 'secret' })
  expect(both.GOOGLE_CLIENT_ID).toBe('id')
})

test('empty values count as unset, as in a copied .env.example', () => {
  const parsed = parseEnv({
    ...base,
    NODE_ENV: 'production',
    GOOGLE_CLIENT_ID: '',
    GOOGLE_CLIENT_SECRET: '',
    ALLOWED_LOGIN_DOMAINS: '',
  })
  expect(parsed.GOOGLE_CLIENT_ID).toBeUndefined()
  expect(parsed.ALLOWED_LOGIN_DOMAINS).toEqual([])
})

test('ALLOWED_LOGIN_DOMAINS is a list of lowercased domains', () => {
  const parsed = parseEnv({
    ...base,
    NODE_ENV: 'production',
    ALLOWED_LOGIN_DOMAINS: 'Snowhound.eu, @example.com',
  })
  expect(parsed.ALLOWED_LOGIN_DOMAINS).toEqual(['snowhound.eu', 'example.com'])
  expect(() =>
    parseEnv({ ...base, NODE_ENV: 'production', ALLOWED_LOGIN_DOMAINS: 'not a domain' }),
  ).toThrow()
})

test('sign-in.demo-with-allowlist-refused: the app refuses DEMO_MODE together with ALLOWED_LOGIN_DOMAINS', () => {
  expect(() =>
    parseEnv({ ...base, NODE_ENV: 'development', ALLOWED_LOGIN_DOMAINS: 'snowhound.eu' }),
  ).toThrow('DEMO_MODE')
})

test('CLIENT_IP_HEADER is a lowercase header name', () => {
  expect(parseEnv({ ...base, CLIENT_IP_HEADER: 'cf-connecting-ip' }).CLIENT_IP_HEADER).toBe(
    'cf-connecting-ip',
  )
  expect(() => parseEnv({ ...base, CLIENT_IP_HEADER: 'CF-Connecting-IP' })).toThrow()
})
