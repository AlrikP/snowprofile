// Page checks in Chromium: the production build on the benchmark database, signed in as the
// benchmark admin, at 1440 x 900 and pixel ratio 1.5 with a 4x CPU slowdown. Gated: HTML,
// JS, and CSS bytes, and DOM nodes. Reported: hydration and long tasks. See perf/README.md.
//
//   bun run perf:pages [--update] [--no-build]

import { type Browser, chromium, type Page } from '@playwright/test'
import { gzipSync } from 'node:zlib'
import { change, readBaseline, table, withinTolerance, writeBaseline } from './checks/baseline'
import { buildApp, type RunningApp, signedInContext, signInCookies, startApp } from './lib/app'
import { seededDatabase } from './lib/database'
import { benchmarkPages } from './lib/inputs'

const BASELINE = 'pages.json'
const CPU_SLOWDOWN = 4
// Time after hydration in which lazy chunks and late tasks land, after which the run reads
// the page.
const SETTLE_MS = 1000

// The gated numbers of one page, all counts.
type Sizes = {
  htmlBytes: number
  htmlGzip: number
  jsGzip: number
  cssGzip: number
  domNodes: number
}
type Timings = { hydrateMs: number; longTasks: number; longTaskMs: number }
type Probe = { hydrated: number; longTasks: number[] }

declare global {
  interface Window {
    perfProbe: Probe
    __REACT_DEVTOOLS_GLOBAL_HOOK__?: unknown
  }
}

// Runs in every page before its own scripts. React reports each commit to the DevTools
// hook when one is installed, production builds too; the first commit after hydrateRoot
// is the hydration, when the page starts to respond.
function installProbe() {
  const probe: Probe = { hydrated: 0, longTasks: [] }
  window.perfProbe = probe
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    supportsFiber: true,
    renderers: new Map(),
    inject: () => 1,
    checkDCE() {},
    onScheduleFiberRoot() {},
    onCommitFiberUnmount() {},
    onPostCommitFiberRoot() {},
    onCommitFiberRoot() {
      if (probe.hydrated === 0) probe.hydrated = performance.now()
    },
  }
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) probe.longTasks.push(entry.duration)
  }).observe({ type: 'longtask', buffered: true })
}

// The router's dehydrated state holds timestamps that run on from the shifted clock. They
// are replaced by fixed text of the same length, so the gzipped size repeats.
function withoutVariation(html: string): string {
  return html
    .replace(/\b1\d{12}\b/g, '1000000000000')
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g, '2000-01-01T00:00:00.000Z')
}

// The page's own response and the scripts and styles it loads, as sent: the server doesn't
// compress, so bodies are gzipped here at level 9, as the budgets check does.
function collectSizes(page: Page, origin: string) {
  const bodies: Promise<{ kind: 'html' | 'js' | 'css'; body: Buffer } | null>[] = []
  const seen = new Set<string>()
  page.on('response', (response) => {
    const url = response.url()
    if (!url.startsWith(origin) || seen.has(url) || !response.ok()) return
    const type = response.request().resourceType()
    const kind =
      type === 'document' ? 'html' : type === 'script' ? 'js' : type === 'stylesheet' ? 'css' : null
    if (!kind) return
    seen.add(url)
    bodies.push(
      response.body().then(
        (body) => ({ kind, body }),
        () => null,
      ),
    )
  })
  return async (): Promise<Omit<Sizes, 'domNodes'>> => {
    const sizes = { htmlBytes: 0, htmlGzip: 0, jsGzip: 0, cssGzip: 0 }
    for (const result of await Promise.all(bodies)) {
      if (!result) continue
      if (result.kind === 'html') {
        const html = Buffer.from(withoutVariation(result.body.toString()))
        sizes.htmlBytes += html.length
        sizes.htmlGzip += gzipSync(html, { level: 9 }).length
      } else {
        sizes[`${result.kind}Gzip`] += gzipSync(result.body, { level: 9 }).length
      }
    }
    return sizes
  }
}

// Opens a page in a fresh context, waits for it to hydrate and settle, and reads its numbers.
async function loadPage(
  browser: Browser,
  app: RunningApp,
  cookies: Awaited<ReturnType<typeof signInCookies>>,
  path: string,
): Promise<{ sizes: Sizes; timings: Timings }> {
  const context = await signedInContext(browser, app, cookies)
  try {
    await context.addInitScript(installProbe)
    const page = await context.newPage()
    const cdp = await context.newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_SLOWDOWN })
    const sizesOf = collectSizes(page, app.url)
    const response = await page.goto(app.url + path)
    if (!response?.ok() || new URL(page.url()).pathname !== path.split('?')[0]) {
      throw new Error(`[perf] ${path} answered ${response?.status()} at ${page.url()}`)
    }
    await page.waitForFunction(() => window.perfProbe.hydrated > 0, null, { timeout: 30_000 })
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(SETTLE_MS)
    const { domNodes, timings } = await page.evaluate(() => {
      const longTasks = window.perfProbe.longTasks
      return {
        domNodes: document.getElementsByTagName('*').length,
        timings: {
          hydrateMs: window.perfProbe.hydrated,
          longTasks: longTasks.length,
          longTaskMs: longTasks.reduce((sum, ms) => sum + ms, 0),
        },
      }
    })
    return { sizes: { ...(await sizesOf()), domNodes }, timings }
  } finally {
    await context.close()
  }
}

// Bytes fail past 1% or 200 bytes; DOM nodes past 1%.
function failed(key: keyof Sizes, before: number, now: number) {
  return !withinTolerance(before, now, key === 'domNodes' ? 0 : 200)
}

async function run() {
  const update = process.argv.includes('--update')
  const started = performance.now()
  if (!process.argv.includes('--no-build')) buildApp()
  const app = await startApp(await seededDatabase())
  const browser = await chromium.launch()
  const sizes: Record<string, Sizes> = {}
  const timings: Record<string, Timings> = {}
  try {
    const cookies = await signInCookies(app)
    for (const { name, path } of benchmarkPages()) {
      const loaded = await loadPage(browser, app, cookies, path)
      sizes[name] = loaded.sizes
      timings[name] = loaded.timings
    }
  } finally {
    await browser.close()
    await app.stop()
  }

  const baseline = readBaseline(BASELINE) as Record<string, Sizes> | null
  const failures: string[] = []
  const rows: string[][] = []
  for (const [name, current] of Object.entries(sizes)) {
    const before = update ? undefined : baseline?.[name]
    for (const key of Object.keys(current) as (keyof Sizes)[]) {
      const bad = before !== undefined && failed(key, before[key], current[key])
      if (bad) failures.push(`${name} ${key} grew: ${before[key]} to ${current[key]}`)
      rows.push([
        `${name} ${key}`,
        String(before?.[key] ?? '-'),
        String(current[key]),
        change(before?.[key], current[key]),
        bad ? 'FAIL' : '',
      ])
    }
  }
  console.log('\nPage sizes')
  console.log(table(['', 'baseline', 'now', 'change', ''], rows))

  console.log(`\nTimings (ms, ${CPU_SLOWDOWN}x CPU slowdown, not gated)`)
  console.log(
    table(
      ['', 'hydrated', 'long tasks', 'long task ms'],
      Object.entries(timings).map(([name, each]) => [
        name,
        each.hydrateMs.toFixed(0),
        String(each.longTasks),
        each.longTaskMs.toFixed(0),
      ]),
    ),
  )

  const seconds = ((performance.now() - started) / 1000).toFixed(1)
  if (update) {
    writeBaseline(BASELINE, sizes)
    console.log(`\nBaseline updated in perf/baselines/${BASELINE} (${seconds} s)`)
  } else if (!baseline) {
    console.log(`\nNo perf/baselines/${BASELINE}; run bun run perf:pages --update`)
    process.exit(1)
  } else if (failures.length > 0) {
    console.log(`\n${failures.length} failed (${seconds} s):`)
    for (const failure of failures) console.log(`  ${failure}`)
    console.log(
      'If the growth is expected, run bun run perf:pages --update twice (the numbers must\n' +
        'repeat) and commit perf/baselines/pages.json with the change, saying why.',
    )
    process.exit(1)
  } else {
    console.log(`\nAll pages passed (${seconds} s)`)
  }
}

await run()
