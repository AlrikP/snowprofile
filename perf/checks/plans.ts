// EXPLAIN QUERY PLAN of every statement the hot calls run, compared with a snapshot. A new
// scan of a work table or a new temporary B-tree fails; any other change is a note.

import { readBaseline, type Result, writeBaseline } from './baseline'
import { hotCalls } from './calls'
import type { Recorder } from './recorder'

// One entry per distinct statement the call runs, in order. `sql` is the statement's
// start, to tell them apart in the snapshot.
type Plan = { sql: string; scans: number; sorts: number; plan: string[] }
type Plans = Record<string, Plan[]>

// Projects, participations, own projects, and their link tables: the tables that grow with
// the organization's work.
const WATCHED = [
  'project',
  'project_contact',
  'project_technology',
  'project_criterion_answer',
  'participation',
  'participation_technology',
  'participation_role',
  'own_project',
  'own_project_technology',
  'own_project_role',
]

// A scan of a watched table under its own name or an alias the statement gives it
// (Drizzle's relational queries call tables d0, d1, and so on). A scan through a covering
// index still reads every row, so it counts.
function scannedTable(line: string, sql: string): string | null {
  const scanned = /^SCAN (\w+)/.exec(line)?.[1]
  if (!scanned) return null
  if (WATCHED.includes(scanned)) return scanned
  for (const match of sql.matchAll(/"(\w+)"(?: as)? "(\w+)"/g)) {
    if (match[2] === scanned && match[1] && WATCHED.includes(match[1])) return match[1]
  }
  return null
}

export function flagged(sql: string, plan: string[]) {
  return {
    scans: plan.filter((line) => scannedTable(line, sql) !== null).length,
    sorts: plan.filter((line) => line.includes('USE TEMP B-TREE')).length,
  }
}

async function collect(recorder: Recorder): Promise<Plans> {
  const plans: Plans = {}
  for (const [name, call] of Object.entries(hotCalls(recorder))) {
    const { statements } = await recorder.record(call)
    const seen = new Set<string>()
    const list: Plan[] = []
    for (const statement of statements) {
      if (seen.has(statement.sql)) continue
      seen.add(statement.sql)
      const plan = await recorder.explain(statement)
      list.push({
        sql: statement.sql.replace(/\s+/g, ' ').slice(0, 80),
        ...flagged(statement.sql, plan),
        plan,
      })
    }
    plans[name] = list
  }
  return plans
}

function total(plans: Plan[] | undefined, key: 'scans' | 'sorts'): number {
  return (plans ?? []).reduce((sum, plan) => sum + plan[key], 0)
}

export async function checkPlans(recorder: Recorder, update: boolean): Promise<Result> {
  const current = await collect(recorder)
  const baseline = readBaseline('plans.json') as Plans | null
  const failures: string[] = []
  const notes: string[] = []

  for (const [name, plans] of Object.entries(current)) {
    const before = baseline?.[name]
    if (baseline && !before) notes.push(`${name}: new call`)
    if (!before || update) continue
    if (total(plans, 'scans') > total(before, 'scans')) {
      failures.push(`${name}: a new scan of ${WATCHED.join(', ')}`)
    }
    if (total(plans, 'sorts') > total(before, 'sorts')) {
      failures.push(`${name}: a new USE TEMP B-TREE`)
    }
    if (JSON.stringify(before) !== JSON.stringify(plans)) notes.push(`${name}: plan changed`)
  }
  for (const name of Object.keys(baseline ?? {})) {
    if (!current[name]) notes.push(`${name}: no longer checked`)
  }

  console.log('\nQuery plans')
  for (const [name, plans] of Object.entries(current)) {
    console.log(
      `  ${name.padEnd(48)} ${String(plans.length).padStart(2)} statements, ` +
        `${total(plans, 'scans')} scans, ${total(plans, 'sorts')} temp sorts`,
    )
  }
  for (const note of notes) console.log(`  note: ${note}`)
  if (failures.length > 0) {
    console.log(
      'The plans are in perf/baselines/plans.json. If a new scan or sort is expected, accept\n' +
        'it with `bun run perf --update` and commit the baseline, saying why.',
    )
  }
  if (update) writeBaseline('plans.json', current)
  else if (!baseline) failures.push('No perf/baselines/plans.json; run bun run perf --update')
  return { failures }
}
