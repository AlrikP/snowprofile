/// <reference types="bun" />

import { describe, expect, test } from 'bun:test'
import { readSearchFilters } from './search-filters'

describe('readSearchFilters', () => {
  test('reads every filter from the URL', () => {
    expect(
      readSearchFilters({
        t: ['a', 'b'],
        match: 'all',
        from: '2019',
        to: '2024-06',
        leavers: true,
      }),
    ).toEqual({ t: ['a', 'b'], match: 'all', from: '2019', to: '2024-06', leavers: true })
  })

  test('drops what it can’t read and keeps the rest', () => {
    expect(readSearchFilters({ t: ['a'], match: 'some', from: '2019-13', leavers: 'yes' })).toEqual(
      {
        t: ['a'],
      },
    )
    expect(readSearchFilters({})).toEqual({})
  })
})
