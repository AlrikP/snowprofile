// Checks how src/ files import each other (AGENTS.md, "Code conventions"): a relative path
// inside the importer's area, and the #/ alias for everything else. An area is one feature
// folder (src/features/<name>/) or another top-level folder of src/; files at the src/
// root belong to no area. A relative path is also the shortest one to its target, so a
// pattern such as oxlint's '../middleware' matches every import of that file. oxlint can't
// tell, because it depends on where a path resolves.
//
// Usage: bun run imports:check

import { readFileSync } from 'node:fs'
import { dirname, join, normalize, relative } from 'node:path'

// The area of a repository-relative path under src/, or null for a file at the src/ root.
export function areaOf(path: string): string | null {
  const parts = normalize(path).split('/')
  if (parts[0] !== 'src' || parts.length <= 2) return null
  return parts[1] === 'features' ? parts.slice(0, 3).join('/') : parts.slice(0, 2).join('/')
}

// Import specifiers in a source file: static, side-effect, re-export, and dynamic.
export function specifiers(source: string): string[] {
  const pattern = /(?:\bfrom\s*|\bimport\s*\(?\s*)['"]([^'"]+)['"]/g
  return [...source.matchAll(pattern)].flatMap((match) => (match[1] ? [match[1]] : []))
}

// The shortest relative specifier for the file that specifier points to from file.
function shortestPath(file: string, specifier: string): string {
  const path = relative(dirname(file), join(dirname(file), specifier)) || '.'
  return path.startsWith('.') ? path : `./${path}`
}

// What is wrong with importing specifier from file, or null when nothing is.
export function importProblem(file: string, specifier: string): string | null {
  const from = areaOf(file)
  if (specifier.startsWith('.')) {
    // A folder's index file stands for the folder: '.' from src/db/seed.ts is src/db/index.
    const target = join(
      dirname(file),
      specifier,
      specifier.split('/').at(-1)?.startsWith('.') ? 'index' : '',
    )
    // #/ reaches only src/; a file outside it, such as messages/, stays relative.
    if (!normalize(target).startsWith('src/')) return null
    if (from === null) return `${specifier} is relative from the src/ root; import it through #/`
    if (areaOf(target) !== from) return `${specifier} leaves ${from}/; import it through #/`
    const shortest = shortestPath(file, specifier)
    if (specifier !== shortest) return `${specifier} takes a detour; import it as '${shortest}'`
    return null
  }
  if (specifier.startsWith('#/')) {
    const target = `src/${specifier.slice(2)}`
    if (from !== null && areaOf(target) === from) {
      return `${specifier} is inside ${from}/; import it with a relative path`
    }
  }
  return null
}

const GENERATED = ['src/paraglide/', 'src/routeTree.gen.ts']

if (import.meta.main) {
  const problems: string[] = []
  for (const file of new Bun.Glob('src/**/*.{ts,tsx}').scanSync()) {
    if (GENERATED.some((path) => file.startsWith(path))) continue
    for (const specifier of specifiers(readFileSync(file, 'utf8'))) {
      const problem = importProblem(file, specifier)
      if (problem) problems.push(`${file}: ${problem}`)
    }
  }
  if (problems.length > 0) {
    console.error(problems.join('\n'))
    console.error(`[imports-check] ${problems.length} import(s) break the area rule.`)
    process.exit(1)
  }
}
