/// <reference types="bun" />

import { describe, expect, test } from 'bun:test'
import * as v from 'valibot'
import { ApproximateNumber, Bilingual, Period, RequiredBilingual } from './schemas'

describe('Period', () => {
  test('accepts dates as precise as known, and an ongoing end', () => {
    expect(v.is(Period, { startDate: '2024-03', endDate: null })).toBe(true)
    expect(v.is(Period, { startDate: '2024-03-15', endDate: '2024' })).toBe(true)
  })

  test('refuses an impossible date and an end before the start', () => {
    expect(v.is(Period, { startDate: '2024-02-30', endDate: null })).toBe(false)
    expect(v.is(Period, { startDate: '2024-03', endDate: '2024-02' })).toBe(false)
  })
})

describe('ApproximateNumber', () => {
  test('is a whole number with a qualifier, or null', () => {
    expect(v.is(ApproximateNumber, { value: 3500, qualifier: 'approximately' })).toBe(true)
    expect(v.is(ApproximateNumber, null)).toBe(true)
    expect(v.is(ApproximateNumber, { value: 3500, qualifier: null })).toBe(false)
    expect(v.is(ApproximateNumber, { value: 3.5, qualifier: 'exact' })).toBe(false)
    expect(v.is(ApproximateNumber, { value: -1, qualifier: 'exact' })).toBe(false)
  })
})

describe('Bilingual', () => {
  test('stores a blank translation as missing', () => {
    expect(v.parse(Bilingual, { et: ' Arendaja ', en: '  ' })).toEqual({
      et: 'Arendaja',
      en: null,
    })
  })

  test('a required one needs at least one language', () => {
    expect(v.is(RequiredBilingual, { et: null, en: 'Developer' })).toBe(true)
    expect(v.is(RequiredBilingual, { et: '', en: null })).toBe(false)
  })
})
