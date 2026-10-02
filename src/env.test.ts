/// <reference types="bun" />

import { expect, test } from 'bun:test'
import { parseEnv } from './env'

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
