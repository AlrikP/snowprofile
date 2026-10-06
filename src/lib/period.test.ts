/// <reference types="bun" />

import { describe, expect, test } from 'bun:test'
import {
  endsBeforeStart,
  formatPeriod,
  isPeriodDate,
  isYearOnly,
  type PeriodInputValue,
  parsePeriodInput,
  periodInputValue,
} from './period'

function input(start: string, end = '', ongoing = false): PeriodInputValue {
  function parts(value: string) {
    const [day = '', month = '', year = ''] = value.split('.')
    return { day, month, year }
  }
  return { start: parts(start), end: parts(end), ongoing }
}

describe('period dates', () => {
  test('accept a year, a month, or a day that exists', () => {
    expect(['2024', '2024-03', '2024-02-29'].map(isPeriodDate)).toEqual([true, true, true])
    expect(['2023-02-29', '2024-13', '2024-00', '24', '2024-3'].map(isPeriodDate)).toEqual([
      false,
      false,
      false,
      false,
      false,
    ])
  })

  test('compare the end at its own precision, as the database does', () => {
    expect(endsBeforeStart('2024-03-15', '2024-03')).toBe(false)
    expect(endsBeforeStart('2024-03', '2024')).toBe(false)
    expect(endsBeforeStart('2024-03', '2024-02-28')).toBe(true)
    expect(endsBeforeStart('2024', '2023-12')).toBe(true)
  })

  test('format as precise as known, open-ended while ongoing', () => {
    expect(formatPeriod('2024-03', null, 'en')).toBe('03-2024 – ongoing')
    expect(formatPeriod('2019', '2021-06-30', 'et')).toBe('2019 – 30-06-2021')
    expect(formatPeriod('2019', '2019', 'en')).toBe('2019')
  })
})

describe('the period input', () => {
  test('stores a day, a month, or only a year', () => {
    expect(parsePeriodInput(input('5.3.2024', '..2025'))).toEqual({
      ok: true,
      startDate: '2024-03-05',
      endDate: '2025',
    })
  })

  test('refuses a day without a month, an impossible date, and a short year', () => {
    expect(parsePeriodInput(input('5..2024'))).toEqual({
      ok: false,
      start: 'day_without_month',
      end: undefined,
    })
    expect(parsePeriodInput(input('30.2.2024'))).toMatchObject({ start: 'invalid_date' })
    expect(parsePeriodInput(input('..24'))).toMatchObject({ start: 'year_required' })
  })

  test('refuses an end before the start', () => {
    expect(parsePeriodInput(input('.3.2024', '.2.2024'))).toEqual({
      ok: false,
      end: 'end_before_start',
    })
  })

  test('saving with Ongoing ticked clears the end, even one that is still typed', () => {
    expect(parsePeriodInput(input('.3.2024', '.2.2023', true))).toEqual({
      ok: true,
      startDate: '2024-03',
      endDate: null,
    })
  })

  test('needs a start, unless it is optional and there is no end', () => {
    expect(parsePeriodInput(input(''))).toMatchObject({ start: 'year_required' })
    expect(parsePeriodInput(input(''), { startRequired: false })).toEqual({
      ok: true,
      startDate: null,
      endDate: null,
    })
    expect(parsePeriodInput(input('', '..2020'), { startRequired: false })).toMatchObject({
      start: 'year_required',
    })
  })

  test('starts from a stored period, ongoing when the end is null', () => {
    expect(periodInputValue('2024-03-05', null)).toEqual(input('5.3.2024', '', true))
    expect(periodInputValue('2019', '2021-06')).toEqual(input('..2019', '.6.2021'))
    expect(periodInputValue(null, null).ongoing).toBe(false)
  })

  test('flags a start known only to the year', () => {
    expect(isYearOnly(input('..2019').start)).toBe(true)
    expect(isYearOnly(input('.3.2019').start)).toBe(false)
    expect(isYearOnly(input('').start)).toBe(false)
  })
})
