// Server load: how fast one app process renders the signed-in benchmark pages, and the CPU
// and memory it uses doing so. Signs in as the benchmark admin over HTTP, with no browser,
// then per page: 5 warm-ups, 30 requests one after another (p50, p95), and 8 seconds with
// 10 requests in flight (requests per second, p95), with the server's CPU time per request.
// Nothing is gated. See perf/README.md.
//
//   bun run perf:load [--no-build]

import { table } from './checks/baseline'
import { buildApp, signInCookies, startApp } from './lib/app'
import { seededDatabase } from './lib/database'
import { benchmarkPages } from './lib/inputs'
import { cpuSeconds, percentile, rssMb } from './lib/process'

const WARM_UPS = 5
const SEQUENTIAL = 30
const CONCURRENCY = 10
const CONCURRENT_MS = 8000

async function timed(url: string, headers: Record<string, string>): Promise<number> {
  const started = performance.now()
  const response = await fetch(url, { headers, redirect: 'manual' })
  await response.arrayBuffer()
  if (!response.ok) throw new Error(`[perf] ${url}: ${response.status}`)
  return performance.now() - started
}

if (!process.argv.includes('--no-build')) buildApp()
const app = await startApp(await seededDatabase())

let peakMb = rssMb(app.pid).now
const sampler = setInterval(() => {
  peakMb = Math.max(peakMb, rssMb(app.pid).now)
}, 100)

try {
  const cookies = await signInCookies(app)
  const headers = { cookie: cookies.map(({ name, value }) => `${name}=${value}`).join('; ') }
  const rows: string[][] = []
  for (const page of benchmarkPages()) {
    const url = app.url + page.path
    for (let i = 0; i < WARM_UPS; i++) await timed(url, headers)

    let cpu = cpuSeconds(app.pid)
    const sequential: number[] = []
    for (let i = 0; i < SEQUENTIAL; i++) sequential.push(await timed(url, headers))
    const sequentialCpu = (cpuSeconds(app.pid) - cpu) / SEQUENTIAL

    cpu = cpuSeconds(app.pid)
    const concurrent: number[] = []
    const started = performance.now()
    await Promise.all(
      Array.from({ length: CONCURRENCY }, async () => {
        while (performance.now() - started < CONCURRENT_MS) {
          concurrent.push(await timed(url, headers))
        }
      }),
    )
    const seconds = (performance.now() - started) / 1000
    const concurrentCpu = (cpuSeconds(app.pid) - cpu) / concurrent.length

    rows.push([
      page.name,
      `${percentile(sequential, 50).toFixed(1)} ms`,
      `${percentile(sequential, 95).toFixed(1)} ms`,
      `${(sequentialCpu * 1000).toFixed(1)} ms`,
      (concurrent.length / seconds).toFixed(1),
      `${percentile(concurrent, 95).toFixed(0)} ms`,
      `${(concurrentCpu * 1000).toFixed(1)} ms`,
    ])
  }
  const memory = rssMb(app.pid)
  peakMb = Math.max(peakMb, memory.now, memory.peak ?? 0)
  console.log()
  console.log(
    table(['Page', 'p50', 'p95', 'CPU/req', 'req/s at 10', 'p95 at 10', 'CPU/req at 10'], rows),
  )
  console.log(`\nRSS: ${memory.now.toFixed(0)} MB at the end, ${peakMb.toFixed(0)} MB peak`)
} finally {
  clearInterval(sampler)
  await app.stop()
}
