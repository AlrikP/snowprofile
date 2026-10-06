// Checks that specs and tests agree (docs/specs/README.md): every scenario in docs/specs/
// has a test whose title starts with its ID, and every ID a test cites is a scenario. It
// checks that a test cites a scenario, not that the test checks what the scenario says.
//
// Usage: bun run specs:check

import { readFileSync } from 'node:fs'
import { basename } from 'node:path'

const ID = '[a-z0-9]+(?:-[a-z0-9]+)*\\.[a-z0-9]+(?:-[a-z0-9]+)*'

// Scenario IDs in a spec, from `#### Scenario: <id>` headings.
export function scenarioIds(spec: string): string[] {
  return [...spec.matchAll(new RegExp(`^#### Scenario: (${ID})\\s*$`, 'gm'))].map(
    (match) => match[1] ?? '',
  )
}

// Modifiers that still run the test. test.skip, test.todo, test.fixme, and the like don't,
// so they cite nothing.
const RUNS = '(?:\\.(?:only|concurrent|serial))?'

// Scenario IDs that test titles start with: test('<id>: ...'), it, and Playwright's setup.
// The transpiler drops comments, so a commented-out test cites nothing either.
export function citedIds(source: string, loader: 'ts' | 'tsx' = 'ts'): string[] {
  const code = new Bun.Transpiler({ loader }).transformSync(source)
  const title = new RegExp(`(?<![\\w.])(?:test|it|setup)${RUNS}\\(\\s*['"\`](${ID}): `, 'g')
  return [...code.matchAll(title)].map((match) => match[1] ?? '')
}

export function specProblems(
  specs: { file: string; source: string }[],
  tests: { file: string; source: string }[],
): string[] {
  const problems: string[] = []
  const scenarios = new Map<string, string>()
  for (const { file, source } of specs) {
    const capability = basename(file, '.md')
    for (const id of scenarioIds(source)) {
      if (!id.startsWith(`${capability}.`)) {
        problems.push(`${file}: scenario ${id} should start with ${capability}.`)
      }
      if (scenarios.has(id)) problems.push(`${file}: scenario ${id} is defined twice`)
      scenarios.set(id, file)
    }
  }
  const cited = new Set<string>()
  for (const { file, source } of tests) {
    for (const id of citedIds(source, file.endsWith('.tsx') ? 'tsx' : 'ts')) {
      cited.add(id)
      if (!scenarios.has(id)) problems.push(`${file}: cites ${id}, which no spec defines`)
    }
  }
  for (const [id, file] of scenarios) {
    if (!cited.has(id)) problems.push(`${file}: no test cites scenario ${id}`)
  }
  return problems
}

const TESTS = ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts', 'e2e/**/*.ts']

function read(patterns: string[]) {
  return patterns.flatMap((pattern) =>
    [...new Bun.Glob(pattern).scanSync()].map((file) => ({
      file,
      source: readFileSync(file, 'utf8'),
    })),
  )
}

if (import.meta.main) {
  const specs = read(['docs/specs/*.md']).filter(({ file }) => !file.endsWith('README.md'))
  // This check's own tests hold sample citations of IDs no spec defines.
  const tests = read(TESTS).filter(({ file }) => file !== 'scripts/specs-check.test.ts')
  const problems = specProblems(specs, tests)
  if (problems.length > 0) {
    console.error(problems.join('\n'))
    console.error(`[specs-check] ${problems.length} problem(s) between specs and tests.`)
    process.exit(1)
  }
  const count = specs.reduce((sum, { source }) => sum + scenarioIds(source).length, 0)
  console.log(`[specs-check] ${count} scenarios in ${specs.length} spec(s), each cited by a test.`)
}
