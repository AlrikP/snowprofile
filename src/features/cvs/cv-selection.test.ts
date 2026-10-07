/// <reference types="bun" />

import { describe, expect, test } from 'bun:test'
import { cvInput, isFiltered, readCvSelection } from './cv-selection'

describe('readCvSelection', () => {
  test('reads the people, language, birth date, and search filter from the URL', () => {
    expect(
      readCvSelection({
        people: ['a', 'b'],
        lang: 'en',
        birth: true,
        t: ['java'],
        from: '2019',
        leavers: true,
      }),
    ).toEqual({
      people: ['a', 'b'],
      lang: 'en',
      birth: true,
      t: ['java'],
      from: '2019',
      leavers: true,
    })
  })

  test('drops what it can’t read and keeps the rest', () => {
    expect(readCvSelection({ people: 'a', lang: 'fi', birth: 'yes', to: '2024' })).toEqual({
      to: '2024',
    })
  })
})

test('a technology, role, or characteristic, or either end of a period filters the projects', () => {
  expect(isFiltered({ people: ['a'], match: 'all', leavers: true })).toBe(false)
  expect(isFiltered({ t: ['java'] })).toBe(true)
  expect(isFiltered({ r: ['architect'] })).toBe(true)
  expect(isFiltered({ c: ['xroad'] })).toBe(true)
  expect(isFiltered({ to: '2017-06' })).toBe(true)
})

test('the CV read gets Estonian, every project, and no birth date unless chosen', () => {
  expect(cvInput({ people: ['a'], match: 'all' })).toEqual({
    profileIds: ['a'],
    language: 'et',
    technologyIds: [],
    roleIds: [],
    criterionIds: [],
    from: null,
    to: null,
    birthDate: false,
  })
})
