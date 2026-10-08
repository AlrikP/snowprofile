// Bundle budgets read from a production build: gzipped JS per page route, gzipped CSS, and
// the server bundle's size.

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'
import { gzipSync } from 'node:zlib'
import { ROOT } from '../lib/database'
import {
  change,
  readBaseline,
  type Result,
  table,
  withinTolerance,
  writeBaseline,
} from './baseline'

type Budgets = {
  jsGzip: Record<string, number>
  // Each JS chunk by name without its hash, so a failure can say which chunks grew: a new
  // feature's own chunk is expected, growth in one every route loads is not.
  chunks: Record<string, number>
  cssGzip: number
  server: number
}

type ManifestRoute = {
  children?: string[]
  preloads?: string[]
  scripts?: { attrs: { src: string } }[]
}

function fromUrl(url: string) {
  return url.replace(/^\/assets\//, '')
}

function hashless(name: string) {
  return name.replace(/-[\w-]{8}\.(m?js)$/, '.$1')
}

function gzipSize(path: string): number {
  return gzipSync(readFileSync(path), { level: 9 }).length
}

function walk(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name))
}

// Static imports only: `import"./x.js"`, `from"./x.js"`. A dynamic import( has a parenthesis
// and is its own lazy load.
function staticImports(assets: string, file: string): string[] {
  const source = readFileSync(join(assets, file), 'utf8')
  const found = new Set<string>()
  for (const match of source.matchAll(/(?:\bfrom|\bimport)\s*["']\.\/([^"']+\.js)["']/g)) {
    if (match[1]) found.add(match[1])
  }
  return [...found]
}

async function manifestRoutes(build: string): Promise<Record<string, ManifestRoute>> {
  const file = readdirSync(join(build, 'server')).find((name) =>
    name.startsWith('_tanstack-start-manifest'),
  )
  if (!file) throw new Error('[perf] No TanStack Start manifest in the server build')
  const module = (await import(pathToFileURL(join(build, 'server', file)).href)) as {
    tsrStartManifest: () => { routes: Record<string, ManifestRoute> }
  }
  return module.tsrStartManifest().routes
}

// Each page route's files: the client entry, the preloads of the route and every route above
// it, and everything those import statically. A page route is one without children, so a
// new page is measured without editing this list.
async function routeFiles(build: string): Promise<Record<string, string[]>> {
  const routes = await manifestRoutes(build)
  const parents = new Map<string, string>()
  for (const [id, route] of Object.entries(routes)) {
    for (const child of route.children ?? []) parents.set(child, id)
  }
  const assets = join(build, 'public/assets')

  const result: Record<string, string[]> = {}
  for (const [id, route] of Object.entries(routes)) {
    if (id === '__root__' || (route.children?.length ?? 0) > 0) continue
    const chain: string[] = []
    for (let at: string | undefined = id; at; at = parents.get(at)) chain.push(at)
    const queue = chain.flatMap((routeId) => [
      ...(routes[routeId]?.scripts?.map((script) => fromUrl(script.attrs.src)) ?? []),
      ...(routes[routeId]?.preloads?.map(fromUrl) ?? []),
    ])
    const seen = new Set<string>()
    for (let file = queue.pop(); file; file = queue.pop()) {
      if (seen.has(file) || !existsSync(join(assets, file))) continue
      seen.add(file)
      queue.push(...staticImports(assets, file))
    }
    result[id] = [...seen].sort()
  }
  return result
}

async function measureBudgets(build: string): Promise<Budgets & { biggest: string[] }> {
  const assets = join(build, 'public/assets')
  const jsGzip: Record<string, number> = {}
  const routes = Object.entries(await routeFiles(build)).sort(([a], [b]) => a.localeCompare(b))
  for (const [route, files] of routes) {
    jsGzip[route] = files.reduce((sum, file) => sum + gzipSize(join(assets, file)), 0)
  }
  const chunks: Record<string, number> = {}
  for (const file of readdirSync(assets)
    .filter((name) => name.endsWith('.js'))
    .sort()) {
    const name = hashless(file)
    chunks[name] = (chunks[name] ?? 0) + gzipSize(join(assets, file))
  }
  const cssGzip = readdirSync(assets)
    .filter((name) => name.endsWith('.css'))
    .reduce((sum, name) => sum + gzipSize(join(assets, name)), 0)

  // The traced native packages in server/node_modules don't change with the code. The
  // manifest holds the checkout's absolute paths, which differ between machines.
  const server = join(build, 'server')
  const sizes = walk(server)
    .filter((file) => !relative(server, file).startsWith('node_modules'))
    .map((file) => ({
      name: relative(server, file),
      size: Buffer.byteLength(readFileSync(file, 'utf8').replaceAll(ROOT, '')),
    }))
    .sort((a, b) => b.size - a.size)
  return {
    jsGzip,
    chunks,
    cssGzip,
    server: sizes.reduce((sum, file) => sum + file.size, 0),
    biggest: sizes.slice(0, 4).map((file) => `${hashless(file.name)} ${file.size}`),
  }
}

// The chunks behind a failed budget. A chunk every route loads shows in every route's number.
function printGrownChunks(baseline: Record<string, number>, current: Record<string, number>) {
  const rows = Object.entries(current)
    .map(([name, size]) => ({ name, size, grown: size - (baseline[name] ?? 0) }))
    .filter((chunk) => chunk.grown > 200)
    .sort((a, b) => b.grown - a.grown)
    .map((chunk) => [
      chunk.name,
      String(baseline[chunk.name] ?? '-'),
      String(chunk.size),
      change(baseline[chunk.name], chunk.size),
    ])
  if (rows.length === 0) return
  console.log('\nChunks that grew by more than 200 bytes (gzipped)')
  console.log(table(['', 'baseline', 'now', 'change'], rows))
}

export async function checkBudgets(build: string, update: boolean): Promise<Result> {
  const { biggest, ...current } = await measureBudgets(build)
  const baseline = readBaseline('budgets.json') as Budgets | null
  const failures: string[] = []
  const rows: string[][] = []

  function row(label: string, base: number | undefined, now: number) {
    const failed = !update && base !== undefined && !withinTolerance(base, now)
    if (failed) failures.push(`${label} grew: ${base} to ${now} bytes`)
    rows.push([label, String(base ?? '-'), String(now), change(base, now), failed ? 'FAIL' : ''])
  }
  for (const [route, size] of Object.entries(current.jsGzip)) {
    row(`js gzip ${route}`, baseline?.jsGzip[route], size)
  }
  row('css gzip', baseline?.cssGzip, current.cssGzip)
  row('server bytes', baseline?.server, current.server)

  console.log('\nBundle budgets (bytes)')
  console.log(table(['', 'baseline', 'now', 'change', ''], rows))
  console.log(`Biggest server files: ${biggest.join(', ')}`)
  if (failures.length > 0) {
    printGrownChunks(baseline?.chunks ?? {}, current.chunks)
    console.log(
      'If the growth is expected (a new feature), accept it with `bun run perf --update` and\n' +
        'commit perf/baselines/budgets.json with the change, saying why.',
    )
  }
  if (update) writeBaseline('budgets.json', current)
  else if (!baseline) failures.push('No perf/baselines/budgets.json; run bun run perf --update')
  return { failures }
}
