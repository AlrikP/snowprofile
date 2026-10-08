// A production build of the app for the harnesses, served on a free port with the benchmark
// database, and a signed-in browser context for it. The build is copied to
// perf/.cache/build, so a later `vite build` into .output can't change the files a
// harness is reading or serving.

import type { Browser, BrowserContext } from '@playwright/test'
import { type ChildProcess, spawn, spawnSync } from 'node:child_process'
import { cpSync, existsSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { join } from 'node:path'
import { DEMO_NOW } from '#/db/demo/generate'
import { shiftBrowserClock } from './clock'
import { CACHE, ROOT, USERS } from './database'

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

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.unref()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      server.close(() => resolve(typeof address === 'object' && address ? address.port : 0))
    })
  })
}

export type RunningApp = { url: string; stop: () => Promise<void> }

// Serves a build on a free port, on a copy of the database so a run's writes don't reach the
// next run, with the server's clock at DEMO_NOW. Demo mode turns on password sign-in for
// the generated users. Bun's .env loading is off, so a developer's .env.local can't change
// the database or the sign-in page. The log goes to perf/.cache/server-<port>.log.
export async function startApp(database: string, build = BUILD): Promise<RunningApp> {
  if (!existsSync(join(build, 'server/index.mjs'))) throw new Error(`[perf] No build in ${build}`)
  const port = await freePort()
  const copy = join(CACHE, `run-${port}.db`)
  cpSync(database, copy)
  const url = `http://127.0.0.1:${port}`
  const server: ChildProcess = spawn(
    'bun',
    [
      '--no-env-file',
      '--preload',
      join(ROOT, 'perf/lib/clock.ts'),
      join(build, 'server/index.mjs'),
    ],
    {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        PATH: process.env.PATH,
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        PORT: String(port),
        PERF_NOW: String(DEMO_NOW.getTime()),
        DATABASE_URL: `file:${copy}`,
        BETTER_AUTH_SECRET: 'perf-harness-secret-perf-harness-secret',
        BETTER_AUTH_URL: url,
        DEMO_MODE: 'true',
      },
    },
  )
  const output: string[] = []
  server.stdout?.on('data', (chunk) => output.push(String(chunk)))
  server.stderr?.on('data', (chunk) => output.push(String(chunk)))

  for (let waited = 0; ; waited += 100) {
    if (server.exitCode !== null) {
      throw new Error(`[perf] Server exited ${server.exitCode}:\n${output.join('')}`)
    }
    const healthy = await fetch(`${url}/api/health`).then(
      (response) => response.ok,
      () => false,
    )
    if (healthy) break
    if (waited > 20_000) {
      server.kill()
      throw new Error(`[perf] Server didn't answer in 20 s:\n${output.join('')}`)
    }
    await Bun.sleep(100)
  }

  return {
    url,
    async stop() {
      if (server.exitCode === null) {
        const exited = new Promise((resolve) => server.once('exit', resolve))
        server.kill()
        await exited
      }
      writeFileSync(join(CACHE, `server-${port}.log`), output.join(''))
      rmSync(copy, { force: true })
    },
  }
}

// The session cookies of a generated user, signed in once over HTTP. Signing in for every
// page would run into Better Auth's sign-in rate limit.
export async function signInCookies(app: RunningApp, who: keyof typeof USERS = 'admin') {
  const response = await fetch(`${app.url}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: app.url },
    body: JSON.stringify(USERS[who]),
  })
  if (!response.ok) throw new Error(`[perf] Sign-in as ${who}: ${response.status}`)
  return response.headers.getSetCookie().map((header) => {
    const [pair = ''] = header.split(';')
    const [name = '', ...value] = pair.split('=')
    return { name, value: value.join('=') }
  })
}

// A fresh browser context (an empty cache) with the session cookies and its clock at
// DEMO_NOW. The cookies are set without an expiry: the server's clock is behind the
// browser's, so the expiry it sends may already be past for the browser.
export async function signedInContext(
  browser: Browser,
  app: RunningApp,
  cookies: { name: string; value: string }[],
): Promise<BrowserContext> {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5,
  })
  await shiftBrowserClock(context, DEMO_NOW)
  const { hostname } = new URL(app.url)
  await context.addCookies(cookies.map((cookie) => ({ ...cookie, domain: hostname, path: '/' })))
  return context
}
