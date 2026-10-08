// What the harnesses open and read on the benchmark organization: its busiest project, a few
// technologies, a role, a characteristic, and its current people's profiles. They come from
// the generated data, so they are the same on any day.

import { DEMO_NOW } from '#/db/demo/generate'
import { generateBenchmarkData } from '#/db/seed'
import { stringifySearch } from '#/lib/search-params'
import { BENCHMARK } from './database'

// The day search and the CV read take as today, for ongoing periods.
export const TODAY = DEMO_NOW.toISOString().slice(0, 10)

function required<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`[perf] The benchmark data has no ${what}`)
  return value
}

export function benchmarkInputs() {
  const data = generateBenchmarkData()
  function technology(name: string) {
    return required(data.technologies.find((row) => row.name === name)?.id, name)
  }
  // The project with the most people on it, so its page is the heaviest.
  const people = new Map<string, number>()
  for (const row of data.participations) {
    people.set(row.projectId, (people.get(row.projectId) ?? 0) + 1)
  }
  const [busiest] = [...people].sort(([, a], [, b]) => b - a)[0] ?? []
  const current = new Set(data.members.map((row) => row.userId))
  const profiles = data.employeeProfiles
    .filter((row) => current.has(row.userId))
    .map((row) => required(row.id, 'profile ID'))
  return {
    projectId: required(busiest, 'participation'),
    postgres: technology('PostgreSQL'),
    java: technology('Java'),
    react: technology('React'),
    roleId: required(data.projectRoles[0]?.id, 'role'),
    criterionId: required(data.tenderCriteria[0]?.id, 'tender criterion'),
    profiles,
  }
}

// The pages the page and load harnesses open: the projects list, the busiest project, search
// by one technology, and the CV page for 10 people.
export function benchmarkPages() {
  const given = benchmarkInputs()
  const base = `/${BENCHMARK.slug}`
  return [
    { name: 'projects', path: `${base}/projects` },
    { name: 'project', path: `${base}/projects/${given.projectId}` },
    { name: 'search', path: `${base}/search${stringifySearch({ t: [given.postgres] })}` },
    {
      name: 'cv (team of 10)',
      path: `${base}/cvs${stringifySearch({ people: given.profiles.slice(0, 10) })}`,
    },
  ]
}
