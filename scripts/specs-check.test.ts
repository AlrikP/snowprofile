/// <reference types="bun" />

import { expect, test } from 'bun:test'
import { citedIds, scenarioIds, specProblems } from './specs-check'

const spec = {
  file: 'docs/specs/demo.md',
  source: `# Demo

### Requirement: Something

#### Scenario: demo.first

- **Given** a thing

#### Scenario: demo.second-case
`,
}

test('scenario IDs come from the scenario headings', () => {
  expect(scenarioIds(spec.source)).toEqual(['demo.first', 'demo.second-case'])
})

test('a test cites an ID at the start of its title, also when the title wraps', () => {
  const source = `test('demo.first: does it', () => {})
it("demo.second-case: renders", () => {})
setup(\`demo.first: signs in as \${role}\`, async () => {})
test(
  'demo.first: a long title the formatter wrapped',
  () => {},
)
test('mentions demo.first: later in the title', () => {})
describe('demo.first: describe titles do not cite', () => {})`
  expect(citedIds(source)).toEqual(['demo.first', 'demo.second-case', 'demo.first', 'demo.first'])
})

test('every scenario needs a citing test, and every citation a scenario', () => {
  const tests = [
    {
      file: 'a.test.ts',
      source: `test('demo.first: x', () => {})\ntest('demo.gone: y', () => {})`,
    },
  ]
  expect(specProblems([spec], tests)).toEqual([
    'a.test.ts: cites demo.gone, which no spec defines',
    'docs/specs/demo.md: no test cites scenario demo.second-case',
  ])
})

test('an ID belongs to its spec, once', () => {
  const misplaced = { file: 'docs/specs/other.md', source: '#### Scenario: demo.first\n' }
  const tests = [
    {
      file: 'a.test.ts',
      source: `test('demo.first: x', () => {})\ntest('demo.second-case: y', () => {})`,
    },
  ]
  expect(specProblems([spec, misplaced], tests)).toEqual([
    'docs/specs/other.md: scenario demo.first should start with other.',
    'docs/specs/other.md: scenario demo.first is defined twice',
  ])
})
