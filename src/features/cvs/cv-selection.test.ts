/// <reference types="bun" />

import { describe, expect, test } from 'bun:test'
import { parseSearch, stringifySearch } from '#/lib/search-params'
import { cvDocumentHref, readCvDocumentParams } from '#/server/cvs/cvs.schemas'
import { type CvSelection, cvInput, isFiltered, readCvSelection } from './cv-selection'

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

  test('reads one person as a list of one, and booleans from their words', () => {
    expect(readCvSelection(parseSearch('?people=a&birth=true&leavers=false'))).toEqual({
      people: ['a'],
      birth: true,
      leavers: false,
    })
  })

  test('drops what it can’t read and keeps the rest', () => {
    expect(readCvSelection({ people: 5, lang: 'fi', birth: 'yes', to: '2024' })).toEqual({
      to: '2024',
    })
  })
})

test('the "Make CV" link and the download link open the same selection', () => {
  const people = ['01a05c32-0000-7000-8000-000000000001', '01a05c32-0000-7000-8000-000000000002']
  const org = '01a05c32-0000-7000-8000-0000000000aa'
  // What search's "Make CV" link holds: the filter and the chosen people.
  const fromSearch: CvSelection = {
    t: ['01a05c32-0000-7000-8000-000000000010'],
    match: 'all',
    r: ['01a05c32-0000-7000-8000-000000000020'],
    from: '2019',
    leavers: true,
    people,
    birth: true,
  }
  const opened = readCvSelection(parseSearch(stringifySearch(fromSearch)))
  expect(opened).toEqual(fromSearch)

  const href = cvDocumentHref(org, cvInput(opened))
  const read = readCvDocumentParams(new URL(href, 'http://localhost').searchParams)
  expect(read.success && read.output).toEqual({ organizationId: org, ...cvInput(opened) })
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
