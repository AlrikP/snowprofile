/// <reference types="bun" />

import { expect, test } from 'bun:test'
import { areaOf, importProblem, specifiers } from './imports-check'

test('a feature folder and every other top-level folder of src/ are areas', () => {
  expect(areaOf('src/features/app-frame/user-menu.tsx')).toBe('src/features/app-frame')
  expect(areaOf('src/server/auth/auth.functions.ts')).toBe('src/server')
  expect(areaOf('src/router.tsx')).toBeNull()
})

test('a relative import stays inside the importer’s area', () => {
  const file = 'src/features/app-frame/app-frame.tsx'
  expect(importProblem(file, './navigation')).toBeNull()
  expect(importProblem(file, '../sign-in/sign-in-page')).toContain('import it through #/')
  expect(importProblem('src/components/page-placeholder.tsx', '../lib/access')).toContain(
    'import it through #/',
  )
})

test('#/ is for other areas only', () => {
  const file = 'src/server/auth/auth.functions.ts'
  expect(importProblem(file, '#/lib/access')).toBeNull()
  expect(importProblem(file, '#/server/middleware')).toContain('relative path')
})

test('a file at the src/ root imports everything through #/', () => {
  expect(importProblem('src/env.test.ts', './env')).toContain('import it through #/')
  expect(importProblem('src/router.tsx', '#/routeTree.gen')).toBeNull()
})

test('a folder’s index and files outside src/ count where they are', () => {
  expect(importProblem('src/db/seed.ts', '.')).toBeNull()
  expect(importProblem('src/lib/messages.test.ts', '../../messages/en.json')).toBeNull()
})

test('every kind of import is found', () => {
  const source = `import a from 'a'
import type { B } from "b"
import 'c'
export { d } from './d'
const e = await import('./e')`
  expect(specifiers(source)).toEqual(['a', 'b', 'c', './d', './e'])
})
