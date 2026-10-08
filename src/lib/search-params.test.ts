/// <reference types="bun" />

import { describe, expect, test } from 'bun:test'
import { readSearchFilters } from './search-filters'
import { parseSearch, stringifySearch } from './search-params'

describe('stringifySearch', () => {
  test('writes a key per value, booleans as words, and strings unquoted', () => {
    expect(
      stringifySearch({ t: ['a', 'b'], r: ['x'], from: '2019', leavers: true, match: undefined }),
    ).toBe('?t=a&t=b&r=x&from=2019&leavers=true')
  })

  test('writes nothing for an empty search or an empty list', () => {
    expect(stringifySearch({})).toBe('')
    expect(stringifySearch({ t: [] })).toBe('')
  })
})

describe('parseSearch', () => {
  test('reads one value as a string and a repeated key as a list', () => {
    expect(parseSearch('?t=a&t=b&from=2019&leavers=true')).toEqual({
      t: ['a', 'b'],
      from: '2019',
      leavers: 'true',
    })
  })

  test('keeps the profile’s and sign-in’s single values, and a path with its own search', () => {
    expect(stringifySearch({ participation: 'pa1' })).toBe('?participation=pa1')
    const signIn = { error: 'unable_to_link_account', redirect: '/invite/abc?x=1&y=2' }
    expect(parseSearch(stringifySearch(signIn))).toEqual(signIn)
  })
})

describe('search filters through the URL', () => {
  function roundTrip(filters: Parameters<typeof stringifySearch>[0]) {
    return readSearchFilters(parseSearch(stringifySearch(filters)))
  }

  test('lists of one and of several, booleans, and period dates come back as they went', () => {
    const filters = {
      t: ['a', 'b'],
      match: 'all' as const,
      r: ['x'],
      c: ['y', 'z'],
      from: '2019',
      to: '2024-06',
      leavers: true,
    }
    expect(roundTrip(filters)).toEqual(filters)
    expect(roundTrip({ leavers: false })).toEqual({ leavers: false })
  })

  test('a hand-edited value it can’t read is dropped, and the rest kept', () => {
    expect(readSearchFilters(parseSearch('?t=a&leavers=yes&from=2019-13&match=some'))).toEqual({
      t: ['a'],
    })
  })
})
