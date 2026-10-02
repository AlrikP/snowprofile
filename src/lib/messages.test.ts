/// <reference types="bun" />

import { expect, test } from 'bun:test'
import en from '../../messages/en.json'
import et from '../../messages/et.json'

test('every message exists in both languages', () => {
  expect(Object.keys(en).sort()).toEqual(Object.keys(et).sort())
  for (const [key, text] of Object.entries({ ...et, ...en })) {
    expect({ key, empty: text.trim() === '' }).toEqual({ key, empty: false })
  }
})
