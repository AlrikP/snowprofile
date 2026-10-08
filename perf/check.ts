// Quick checks, no browser: bundle budgets against the baselines in perf/baselines/.
// `bun run perf`; `--update` rewrites the baselines. See perf/README.md.

import { checkBudgets } from './checks/budgets'
import { buildApp } from './lib/app'

const update = process.argv.includes('--update')
const started = performance.now()

const build = buildApp()
const failures = (await checkBudgets(build, update)).failures

const seconds = ((performance.now() - started) / 1000).toFixed(1)
if (update) {
  console.log(`\nBaselines updated in perf/baselines/ (${seconds} s)`)
} else if (failures.length > 0) {
  console.log(`\n${failures.length} failed (${seconds} s):`)
  for (const failure of failures) console.log(`  ${failure}`)
  process.exit(1)
} else {
  console.log(`\nAll checks passed (${seconds} s)`)
}
