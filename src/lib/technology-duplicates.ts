// Near-duplicate technology names (docs/architecture.md, "Technology duplicates"): two
// names whose stems match, such as Postgres and PostgreSQL, or React.js and React. Names
// that normalize the same are exact duplicates, which the catalogue refuses instead.
import { normalizeName } from './normalize-name'

// Abbreviations and translations no suffix rule reaches, to the name they stand for.
const ALIASES = new Map([
  ['postgres', 'postgresql'],
  ['k8s', 'kubernetes'],
  ['ts', 'typescript'],
  ['js', 'javascript'],
  ['xroad', 'xtee'],
  ['mongo', 'mongodb'],
])

// A trailing version (Java 21, Vue 3), then one suffix a name is often written with or
// without.
const VERSION = /\d+$/
const SUFFIX = /(?:js|sql|db|lang|core|css|search)$/

// A stem shorter than this keeps its suffix, so a name isn't stripped to almost nothing.
const MIN_STEM = 2

function technologyStem(name: string): string {
  const unversioned = normalizeName(name).replace(VERSION, '')
  const canonical = ALIASES.get(unversioned) ?? unversioned
  const stripped = canonical.replace(SUFFIX, '')
  return stripped.length >= MIN_STEM ? stripped : canonical
}

export function areNearDuplicates(a: string, b: string): boolean {
  const stem = technologyStem(a)
  return stem !== '' && normalizeName(a) !== normalizeName(b) && stem === technologyStem(b)
}

type Entry = { id: string; name: string; projects: number; people: number }

// Which of two entries a merge should keep: the one with more uses; on a tie, the one
// written without an alias or a version, then the shorter.
function keeps<T extends Entry>(a: T, b: T): T {
  const uses = a.projects + a.people - (b.projects + b.people)
  if (uses !== 0) return uses > 0 ? a : b
  function plain(entry: Entry) {
    const normalized = normalizeName(entry.name)
    return !ALIASES.has(normalized) && !VERSION.test(normalized)
  }
  if (plain(a) !== plain(b)) return plain(a) ? a : b
  return normalizeName(a.name).length <= normalizeName(b.name).length ? a : b
}

type DistinctPair = { technologyId: string; otherTechnologyId: string }

// A pair as stored when an admin marks it "Not a duplicate": the lower ID first.
function distinctPairKey(a: string, b: string) {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

function distinctPairKeys(distinct: DistinctPair[]) {
  return new Set(distinct.map((pair) => distinctPairKey(pair.technologyId, pair.otherTechnologyId)))
}

// The live entry a new or changed name nearly duplicates, unless an admin marked that pair
// "Not a duplicate". exceptId is the entry being renamed.
export function nearDuplicateOf<T extends { id: string; name: string }>(
  technologies: T[],
  name: string,
  distinct: DistinctPair[],
  exceptId?: string,
): T | undefined {
  const dismissed = distinctPairKeys(distinct)
  return technologies.find(
    (each) =>
      each.id !== exceptId &&
      areNearDuplicates(name, each.name) &&
      !(exceptId && dismissed.has(distinctPairKey(each.id, exceptId))),
  )
}

// Every near-duplicate pair in the catalogue that no admin marked "Not a duplicate", each
// as the entry to merge and the one to keep, most used first.
export function nearDuplicatePairs<T extends Entry>(
  technologies: T[],
  distinct: DistinctPair[],
): { from: T; into: T }[] {
  const dismissed = distinctPairKeys(distinct)
  const byStem = new Map<string, T[]>()
  for (const technology of technologies) {
    const stem = technologyStem(technology.name)
    if (stem === '') continue
    byStem.set(stem, [...(byStem.get(stem) ?? []), technology])
  }
  const pairs: { from: T; into: T }[] = []
  for (const group of byStem.values()) {
    for (const [index, a] of group.entries()) {
      for (const b of group.slice(index + 1)) {
        if (dismissed.has(distinctPairKey(a.id, b.id))) continue
        const into = keeps(a, b)
        pairs.push({ from: into === a ? b : a, into })
      }
    }
  }
  return pairs.sort(
    (x, y) =>
      y.into.projects + y.into.people - (x.into.projects + x.into.people) ||
      x.into.name.localeCompare(y.into.name),
  )
}
