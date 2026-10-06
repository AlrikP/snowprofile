/// <reference types="bun" />

import { expect, test } from 'bun:test'
import { QUALIFIERS as DATABASE_QUALIFIERS } from '#/db/schema'
import { formatApproximateNumber, parseApproximateNumber, QUALIFIERS } from './approximate-number'

test('the qualifiers are the ones the database accepts', () => {
  expect([...QUALIFIERS]).toEqual([...DATABASE_QUALIFIERS])
})

test('an empty number is unknown, whatever the qualifier', () => {
  expect(parseApproximateNumber({ value: ' ', qualifier: 'more_than' })).toEqual({
    ok: true,
    value: null,
  })
})

test('a number may group its digits with spaces', () => {
  expect(parseApproximateNumber({ value: '10 000', qualifier: 'more_than' })).toEqual({
    ok: true,
    value: { value: 10000, qualifier: 'more_than' },
  })
})

test('anything but a whole number is refused', () => {
  for (const value of ['~3500', '3.5', '-1', '12h', '99999999999999999']) {
    expect(parseApproximateNumber({ value, qualifier: 'exact' })).toEqual({ ok: false })
  }
})

test('shows the qualifier, except for an exact number', () => {
  expect(formatApproximateNumber({ value: 4200, qualifier: 'approximately' }, 'hours', 'en')).toBe(
    'approximately 4,200 h',
  )
  expect(formatApproximateNumber({ value: 120, qualifier: 'exact' }, 'hours', 'en')).toBe('120 h')
  expect(formatApproximateNumber({ value: 250000, qualifier: 'more_than' }, 'euros', 'et')).toBe(
    'rohkem kui 250 000 €',
  )
})
