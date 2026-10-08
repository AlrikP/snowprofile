// A production build of the app for the harnesses. It is copied to perf/.cache/build, so a
// later `vite build` into .output can't change the files a harness is reading.

import { spawnSync } from 'node:child_process'
import { cpSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { CACHE, ROOT } from './database'

const BUILD = join(CACHE, 'build')

// Builds the working tree as it is, in a few seconds. Returns the build folder, laid out
// like .output (public/, server/). The messages must be compiled first.
export function buildApp(): string {
  const started = performance.now()
  const result = spawnSync('bunx', ['--bun', 'vite', 'build'], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, NODE_ENV: 'production' },
  })
  if (result.status !== 0) {
    throw new Error(`[perf] vite build failed:\n${result.stdout}\n${result.stderr}`)
  }
  rmSync(BUILD, { recursive: true, force: true })
  cpSync(join(ROOT, '.output'), BUILD, { recursive: true })
  console.log(`[perf] Built in ${((performance.now() - started) / 1000).toFixed(1)} s`)
  return BUILD
}
