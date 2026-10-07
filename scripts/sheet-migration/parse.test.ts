/// <reference types="bun" />

import { describe, expect, test } from 'bun:test'
import {
  parseApproximate,
  parseCalendarDate,
  parsePeriod,
  parsePeriodDate,
  parseProjectRef,
  parseRoles,
  parseTechnologies,
  parseYearRange,
} from './parse'

function month(year: number, monthNumber: number, day = 1) {
  return new Date(Date.UTC(year, monthNumber - 1, day))
}

describe('periods', () => {
  test('reads the sheet’s dates at the precision it has', () => {
    expect(parsePeriodDate(month(2020, 5))).toEqual({ ok: true, value: '2020-05' })
    // A month-formatted cell holding the month's last day is still that month.
    expect(parsePeriodDate(month(2022, 2, 28))).toEqual({ ok: true, value: '2022-02' })
    expect(parsePeriodDate('05.2020')).toEqual({ ok: true, value: '2020-05' })
    expect(parsePeriodDate('6.2015')).toEqual({ ok: true, value: '2015-06' })
    expect(parsePeriodDate('10-2021')).toEqual({ ok: true, value: '2021-10' })
    expect(parsePeriodDate('3/2024')).toEqual({ ok: true, value: '2024-03' })
    expect(parsePeriodDate('2018')).toEqual({ ok: true, value: '2018' })
    expect(parsePeriodDate('2018.0')).toEqual({ ok: true, value: '2018' })
    expect(parsePeriodDate('01.03.2022')).toEqual({ ok: true, value: '2022-03-01' })
  })

  test('puts back the zero a month typed as a number loses', () => {
    expect(parsePeriodDate('10.202')).toEqual({ ok: true, value: '2020-10' })
    expect(parsePeriodDate('12.2018')).toEqual({ ok: true, value: '2018-12' })
  })

  test('reads open ends as ongoing', () => {
    for (const end of ['jätkuv', 'Jätkuv', '...', '-', null]) {
      expect(parsePeriod(month(2021, 10), end)).toEqual({
        ok: true,
        value: { startDate: '2021-10', endDate: null },
      })
    }
  })

  test('sheet-migration.unparsed-reported: a range in one cell, a stray number, or a reversed period has a reason', () => {
    for (const text of ['juuni-okt 2024', '06-2024, 02-2025', 'sept-dets 2022', '498', '1618.5']) {
      const parsed = parsePeriodDate(text)
      expect(parsed.ok).toBe(false)
      if (!parsed.ok) expect(parsed.reason).toStartWith('Not a date')
    }
    expect(parsePeriod(month(2023, 6), month(2022, 1))).toEqual({
      ok: false,
      reason: 'The end is before the start.',
    })
    expect(parsePeriod(null, 'jätkuv')).toEqual({ ok: false, reason: 'No start date.' })
  })

  test('reads an education period in one cell', () => {
    expect(parseYearRange('2017-2020')).toEqual({
      ok: true,
      value: { startDate: '2017', endDate: '2020' },
    })
    expect(parseYearRange('1997 - 2003')).toEqual({
      ok: true,
      value: { startDate: '1997', endDate: '2003' },
    })
    expect(parseYearRange('2019-')).toEqual({
      ok: true,
      value: { startDate: '2019', endDate: null },
    })
    expect(parseYearRange('2020-2025 (lõputöö pooleli)').ok).toBe(false)
  })

  test('reads birth and join dates as days, a month as its first day', () => {
    expect(parseCalendarDate('14.06.1990')).toEqual({ ok: true, value: '1990-06-14' })
    expect(parseCalendarDate('14/06/1990')).toEqual({ ok: true, value: '1990-06-14' })
    expect(parseCalendarDate('14.06.90')).toEqual({ ok: true, value: '1990-06-14' })
    expect(parseCalendarDate(month(2021, 3))).toEqual({ ok: true, value: '2021-03-01' })
    expect(parseCalendarDate('3.2024')).toEqual({ ok: true, value: '2024-03-01' })
    expect(parseCalendarDate('2021.0').ok).toBe(false)
  })
})

describe('hours and cost', () => {
  test('reads the value and how precise it is', () => {
    expect(parseApproximate('~3500h')).toEqual({
      ok: true,
      value: { value: 3500, qualifier: 'approximately' },
    })
    expect(parseApproximate('~5200 h')).toEqual({
      ok: true,
      value: { value: 5200, qualifier: 'approximately' },
    })
    expect(parseApproximate('> 10 000h')).toEqual({
      ok: true,
      value: { value: 10000, qualifier: 'more_than' },
    })
    expect(parseApproximate('> 700 000€')).toEqual({
      ok: true,
      value: { value: 700000, qualifier: 'more_than' },
    })
    expect(parseApproximate('3350+')).toEqual({
      ok: true,
      value: { value: 3350, qualifier: 'more_than' },
    })
    expect(parseApproximate(' üle 10 000 töötunni')).toEqual({
      ok: true,
      value: { value: 10000, qualifier: 'more_than' },
    })
    expect(parseApproximate('2100')).toEqual({
      ok: true,
      value: { value: 2100, qualifier: 'exact' },
    })
    expect(parseApproximate('200h ')).toEqual({
      ok: true,
      value: { value: 200, qualifier: 'exact' },
    })
    expect(parseApproximate('622.5')).toEqual({
      ok: true,
      value: { value: 623, qualifier: 'approximately' },
    })
  })

  test('sheet-migration.unparsed-reported: text beside the number has a reason', () => {
    expect(parseApproximate('Isiklikult kõvasti').ok).toBe(false)
    expect(parseApproximate('jaan-mai 2024').ok).toBe(false)
  })
})

describe('project references', () => {
  test('a number in any of the sheet’s spellings', () => {
    for (const cell of ['10', '10.0', 'Projekt10', 'Projekt 10', 'projekt10']) {
      expect(parseProjectRef(cell)).toEqual({ ok: true, value: { number: 10 } })
    }
  })

  test('a name, normalized as the catalogue compares names', () => {
    expect(parseProjectRef('Telia iseteenindus ')).toEqual({
      ok: true,
      value: { name: 'Telia iseteenindus', normalizedName: 'teliaiseteenindus' },
    })
  })

  test('sheet-migration.unparsed-reported: a date is no reference', () => {
    expect(parseProjectRef(month(2022, 8))).toEqual({
      ok: false,
      reason: 'A date, not a project number or name.',
    })
  })
})

describe('technologies', () => {
  test('splits a list, with categories from line prefixes', () => {
    const parsed = parseTechnologies(
      'Frontend: React, Typescript\n\nBackend: Java 21, Spring Boot 3, Postgres',
    )
    expect(parsed).toEqual({
      technologies: [
        { name: 'React', category: 'Frontend' },
        { name: 'Typescript', category: 'Frontend' },
        { name: 'Java', category: 'Backend' },
        { name: 'Spring Boot', category: 'Backend' },
        { name: 'Postgres', category: 'Backend' },
      ],
      rejected: [],
    })
  })

  test('reads "+" and "ja" as separators, and drops versions and what a name was used for', () => {
    function names(text: string) {
      return parseTechnologies(text).technologies.map((each) => each.name)
    }
    expect(names('Java + Spring MVC + Oracle backend ja JSP + jQuery frontend.')).toEqual([
      'Java',
      'Spring MVC',
      'Oracle',
      'JSP',
      'jQuery',
    ])
    expect(names('React, Vite, MobX, Java 8 - 21, Spring ja Spring Boot')).toEqual([
      'React',
      'Vite',
      'MobX',
      'Java',
      'Spring',
      'Spring Boot',
    ])
    expect(names('Java + aranea raamistik, RabbitMQ liidestus, AngularJS, Angular 9')).toEqual([
      'Java',
      'aranea',
      'RabbitMQ',
      'AngularJS',
      'Angular',
    ])
    expect(names('React, react, React.')).toEqual(['React'])
  })

  test('sheet-migration.unparsed-reported: a sentence isn’t a name', () => {
    expect(parseTechnologies('Nii minimaalselt et pmst ei, React').rejected).toEqual([
      'Nii minimaalselt et pmst ei',
    ])
  })
})

test('splits roles on commas and slashes', () => {
  expect(parseRoles('Arhitekt, team lead')).toEqual(['Arhitekt', 'team lead'])
  expect(parseRoles('Tehniline analüütik / arhitekt')).toEqual(['Tehniline analüütik', 'arhitekt'])
  expect(parseRoles(null)).toEqual([])
})
