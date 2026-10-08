// The hot server reads, called the way the pages call them, on the benchmark organization:
// the project list and page, search, and the CV read. The query plan and read checks run
// the same calls. Inputs come from the generated data, so they are the same on any day.

import { DEMO_NOW } from '#/db/demo/generate'
import { generateBenchmarkData } from '#/db/seed'
import type { CvInput } from '#/server/cvs/cvs.schemas'
import { cv } from '#/server/cvs/cvs.server'
import { projectList, projectView } from '#/server/projects/projects.server'
import type { SearchInput } from '#/server/search/search.schemas'
import { search } from '#/server/search/search.server'
import type { Recorder } from './recorder'

// The day search and the CV read take as today, for ongoing periods.
const TODAY = DEMO_NOW.toISOString().slice(0, 10)

function required<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`[perf] The benchmark data has no ${what}`)
  return value
}

function inputs() {
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

const NO_FILTER = { technologyIds: [], roleIds: [], criterionIds: [], from: null, to: null }

export function hotCalls(recorder: Recorder): Record<string, () => Promise<unknown>> {
  const { db, scopes } = recorder
  const { admin, employee } = scopes
  const given = inputs()
  const team = given.profiles.slice(0, 10)

  function searchFor(input: Partial<SearchInput>) {
    return search(db, admin, { ...NO_FILTER, match: 'any', leavers: false, ...input }, TODAY)
  }
  function cvOf(input: Partial<CvInput>) {
    return cv(
      db,
      admin,
      { ...NO_FILTER, profileIds: team, language: 'en', birthDate: false, ...input },
      TODAY,
    )
  }

  return {
    'project list (admin)': () => projectList(db, admin),
    'project list (employee)': () => projectList(db, employee),
    'project page (admin)': () => projectView(db, admin, { projectId: given.projectId }),
    'project page (employee)': () => projectView(db, employee, { projectId: given.projectId }),
    'search, one technology': () => searchFor({ technologyIds: [given.postgres] }),
    'search, all of three technologies since 2022': () =>
      searchFor({
        technologyIds: [given.postgres, given.java, given.react],
        match: 'all',
        from: '2022',
      }),
    'search, role and characteristic, with leavers': () =>
      searchFor({ roleIds: [given.roleId], criterionIds: [given.criterionId], leavers: true }),
    'cv, one person': () => cvOf({ profileIds: team.slice(0, 1) }),
    'cv, team of 10': () => cvOf({}),
    'cv, team of 10, one technology': () => cvOf({ technologyIds: [given.postgres] }),
    'cv, team of 50 (the most a CV takes)': () => cvOf({ profileIds: given.profiles.slice(0, 50) }),
  }
}
