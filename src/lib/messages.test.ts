/// <reference types="bun" />

import { expect, test } from 'bun:test'
import { LOCALES } from '#/db/schema'
import { m } from '#/paraglide/messages.js'
import { locales } from '#/paraglide/runtime.js'
import en from '../../messages/en.json'
import et from '../../messages/et.json'

test('every message exists in both languages', () => {
  expect(Object.keys(en).sort()).toEqual(Object.keys(et).sort())
  for (const [key, text] of Object.entries({ ...et, ...en })) {
    // A message with variants, such as plural forms, is an array.
    const empty = typeof text === 'string' ? text.trim() === '' : text.length === 0
    expect({ key, empty }).toEqual({ key, empty: false })
  }
})

test('the database accepts exactly the UI locales', () => {
  expect([...LOCALES].sort()).toEqual([...locales].sort())
})

test('English counts take the singular for one', () => {
  function explanation(projects: number, people: number) {
    return m.technology_merge_explanation({ projects, people, name: 'X' }, { locale: 'en' })
  }
  expect(explanation(1, 1)).toStartWith('Its uses on 1 project and by 1 person move')
  expect(explanation(1, 2)).toStartWith('Its uses on 1 project and by 2 people move')
  expect(explanation(0, 1)).toStartWith('Its uses on 0 projects and by 1 person move')
  expect(explanation(3, 4)).toStartWith('Its uses on 3 projects and by 4 people move')
})
