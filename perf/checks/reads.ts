// What the hot calls read: the rows their statements returned and the bytes of the result,
// both gated. The time per call is the median of a few runs and only printed.
//
// Rows are the rows the statements returned, not the rows SQLite visited: libsql doesn't
// expose sqlite3_stmt_status, and EXPLAIN QUERY PLAN shows no row counts.

import {
  change,
  readBaseline,
  type Result,
  table,
  withinTolerance,
  writeBaseline,
} from './baseline'
import { hotCalls } from './calls'
import type { Recorder } from './recorder'

const RUNS = 5

type Read = { rows: number; bytes: number }
type Reads = Record<string, Read>

async function measure(recorder: Recorder, call: () => Promise<unknown>) {
  await call()
  const times: number[] = []
  let read: Read = { rows: 0, bytes: 0 }
  for (let i = 0; i < RUNS; i++) {
    const started = performance.now()
    const { result, statements } = await recorder.record(call)
    times.push(performance.now() - started)
    read = {
      rows: statements.reduce((sum, statement) => sum + statement.rows, 0),
      bytes: Buffer.byteLength(JSON.stringify(result)),
    }
  }
  times.sort((a, b) => a - b)
  return { read, ms: times[Math.floor(RUNS / 2)] ?? 0 }
}

export async function checkReads(recorder: Recorder, update: boolean): Promise<Result> {
  const current: Reads = {}
  const timings: Record<string, number> = {}
  for (const [name, call] of Object.entries(hotCalls(recorder))) {
    const { read, ms } = await measure(recorder, call)
    current[name] = read
    timings[name] = ms
  }

  const baseline = readBaseline('reads.json') as Reads | null
  const failures: string[] = []
  const rows: string[][] = []
  for (const [name, read] of Object.entries(current)) {
    const before = update ? undefined : baseline?.[name]
    const failed =
      before !== undefined &&
      (read.rows > before.rows || !withinTolerance(before.bytes, read.bytes))
    if (failed) {
      failures.push(
        `${name}: ${before.rows} to ${read.rows} rows, ${before.bytes} to ${read.bytes} bytes`,
      )
    }
    rows.push([
      name,
      String(read.rows),
      change(before?.rows, read.rows),
      String(read.bytes),
      change(before?.bytes, read.bytes),
      (timings[name] ?? 0).toFixed(1),
      failed ? 'FAIL' : '',
    ])
  }

  console.log(`\nReads (ms is the median of ${RUNS} runs, not gated)`)
  console.log(table(['', 'rows', 'change', 'bytes', 'change', 'ms', ''], rows))
  if (update) writeBaseline('reads.json', current)
  else if (!baseline) failures.push('No perf/baselines/reads.json; run bun run perf --update')
  return { failures }
}
