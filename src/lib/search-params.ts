// URL search params as repeated keys, people=a&people=b&leavers=true (docs/architecture.md,
// "Application rules"). The router and the CV download link both write them here, so the
// two can't drift.
import * as v from 'valibot'

export function stringifySearch(search: Record<string, unknown>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(search)) {
    for (const each of Array.isArray(value) ? value : [value]) {
      if (each === undefined || each === null) continue
      params.append(key, typeof each === 'object' ? JSON.stringify(each) : String(each))
    }
  }
  const text = params.toString()
  return text ? `?${text}` : ''
}

// Every value a string, and a key given more than once a list. Readers accept a list's
// single value, since one value reads the same as a list of one.
export function parseSearch(searchStr: string): Record<string, unknown> {
  const search: Record<string, string | string[]> = {}
  for (const [key, value] of new URLSearchParams(searchStr)) {
    const known = search[key]
    search[key] = known === undefined ? value : [...(Array.isArray(known) ? known : [known]), value]
  }
  return search
}

// A list param as the URL gives it, one value or several. The router also validates the
// typed search a page navigates with, so a list arrives as an array too.
export const ListParam = v.optional(
  v.pipe(
    v.union([v.string(), v.array(v.string())]),
    v.transform((value) => (typeof value === 'string' ? [value] : value)),
  ),
)

// A boolean param: "true" or "false" in the URL, or a boolean from a navigation.
export const BooleanParam = v.optional(
  v.pipe(
    v.union([v.boolean(), v.picklist(['true', 'false'])]),
    v.transform((value) => value === true || value === 'true'),
  ),
)
