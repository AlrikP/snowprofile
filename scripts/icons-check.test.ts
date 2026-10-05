/// <reference types="bun" />

import { expect, test } from 'bun:test'
import { fixLucide, lucideRenames, unsuffixedIcons } from './icons-check'

test('Lucide imports need the Icon suffix; types and suffixed names pass', () => {
  const source = `import { Clock, XIcon, type LucideIcon } from 'lucide-react'
import type { LucideProps } from 'lucide-react'`
  expect(lucideRenames(source)).toEqual({
    imported: [{ from: 'Clock', to: 'ClockIcon' }],
    local: [{ from: 'Clock', to: 'ClockIcon' }],
  })
})

test('an alias needs the suffix too', () => {
  expect(lucideRenames(`import { ClockIcon as Time } from 'lucide-react'`).local).toEqual([
    { from: 'Time', to: 'TimeIcon' },
  ])
})

test('--fix renames the import and its uses, and leaves other names alone', () => {
  const source = `import { Clock, XIcon } from 'lucide-react'

export function Late() {
  const label = 'Clock'
  return <span title={label}><Clock /><XIcon /> {props.Clock}</span>
}`
  expect(fixLucide(source)).toBe(`import { ClockIcon, XIcon } from 'lucide-react'

export function Late() {
  const label = 'Clock'
  return <span title={label}><ClockIcon /><XIcon /> {props.Clock}</span>
}`)
})

test('--fix renames an unsuffixed import kept under an alias', () => {
  expect(fixLucide(`import { Clock as TimeIcon } from 'lucide-react'`)).toBe(
    `import { ClockIcon as TimeIcon } from 'lucide-react'`,
  )
})

test('a hand-written component returning an <svg> needs the suffix', () => {
  const source = `function Logo() {
  return (
    <svg viewBox="0 0 1 1" />
  )
}

function MarkIcon() {
  return <svg viewBox="0 0 1 1" />
}

function Card() {
  return <div />
}`
  expect(unsuffixedIcons(source)).toEqual(['Logo'])
})
