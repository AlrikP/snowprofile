// Checks that icon components end in Icon, so JSX shows what they are (AGENTS.md, "Code
// conventions"): Lucide imports use the suffixed names (ClockIcon, not Clock), and a
// hand-written component that returns an <svg> is named the same way. --fix renames Lucide
// imports and their uses in the file; a hand-written icon is renamed by hand, because
// other files import it.
//
// Usage: bun run icons:check [--fix]

import { readFileSync, writeFileSync } from 'node:fs'

const LUCIDE_IMPORT = /\b(import|export)\s+(type\s+)?\{([^}]*)\}\s*from\s*['"]lucide-react['"]/g

type Rename = { from: string; to: string }

// The Lucide names a source file imports without the suffix, and what they become.
export function lucideRenames(source: string): { imported: Rename[]; local: Rename[] } {
  const imported: Rename[] = []
  const local: Rename[] = []
  for (const [, , typeOnly, names = ''] of source.matchAll(LUCIDE_IMPORT)) {
    if (typeOnly) continue
    for (const entry of names.split(',')) {
      const name = entry.trim()
      if (!name || name.startsWith('type ')) continue
      const [original = '', alias] = name.split(/\s+as\s+/)
      if (!original.endsWith('Icon')) imported.push({ from: original, to: `${original}Icon` })
      const used = alias ?? original
      if (!used.endsWith('Icon')) local.push({ from: used, to: `${used}Icon` })
    }
  }
  return { imported, local }
}

// Lucide exports every icon under both names, so the fix renames the import and, where
// the file uses the bare name, every use of it.
export function fixLucide(source: string): string {
  const { imported, local } = lucideRenames(source)
  let fixed = source.replace(LUCIDE_IMPORT, (statement) =>
    imported.reduce(
      (text, { from, to }) => text.replace(new RegExp(`\\b${from}\\b(?!\\s+as)`), to),
      statement.replace(
        /\b(\w+)\s+as\s+(\w+)/g,
        (_pair, original: string, alias: string) =>
          `${original.endsWith('Icon') ? original : `${original}Icon`} as ${alias}`,
      ),
    ),
  )
  for (const { from, to } of local) {
    fixed = fixed.replace(new RegExp(`(?<![.\\w'"])${from}\\b(?!['"])`, 'g'), to)
  }
  return fixed
}

// Components that return an <svg> but don't end in Icon.
export function unsuffixedIcons(source: string): string[] {
  const names: string[] = []
  const declarations = [...source.matchAll(/\bfunction\s+([A-Z]\w*)\s*\(/g)]
  declarations.forEach((match, index) => {
    const body = source.slice(match.index, declarations[index + 1]?.index)
    const name = match[1] ?? ''
    if (/return\s*\(?\s*<svg\b/.test(body) && !name.endsWith('Icon')) names.push(name)
  })
  return names
}

const FILES = ['src/**/*.{ts,tsx}', 'prototypes/lib/**/*.ts', 'e2e/**/*.ts']

if (import.meta.main) {
  const fix = process.argv.includes('--fix')
  const problems: string[] = []
  for (const pattern of FILES) {
    for (const file of new Bun.Glob(pattern).scanSync()) {
      if (file.startsWith('src/paraglide/')) continue
      const source = readFileSync(file, 'utf8')
      const { imported, local } = lucideRenames(source)
      if (fix && (imported.length > 0 || local.length > 0)) {
        writeFileSync(file, fixLucide(source))
      } else {
        for (const { from, to } of [...imported, ...local]) {
          problems.push(`${file}: ${from} from lucide-react; use ${to}`)
        }
      }
      for (const name of unsuffixedIcons(source)) {
        problems.push(`${file}: the icon component ${name} should be named ${name}Icon`)
      }
    }
  }
  if (problems.length > 0) {
    console.error(problems.join('\n'))
    console.error(`[icons-check] ${problems.length} icon name(s) lack the Icon suffix.`)
    if (!fix) console.error('[icons-check] bun run icons:check --fix renames the Lucide ones.')
    process.exit(1)
  }
}
