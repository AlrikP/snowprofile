// The CV selection as URL search params, so search's "Make CV" can link to it and a CV can
// be shared and reloaded. The project filter and the leavers box use search's keys.
import * as v from 'valibot'
import { readSearchFilters, type SearchFilters } from '#/lib/search-filters'
import { BooleanParam, ListParam } from '#/lib/search-params'
import type { CvInput } from '#/server/cvs/cvs.schemas'

const Extra = v.object({
  // Profile IDs.
  people: ListParam,
  lang: v.optional(v.picklist(['et', 'en'])),
  birth: BooleanParam,
  layout: v.optional(v.picklist(['each', 'combined'])),
})

export type CvSelection = SearchFilters & v.InferOutput<typeof Extra>

// What the URL holds, or nothing for a value it can't read, so a hand-edited link still
// opens the page.
export function readCvSelection(search: Record<string, unknown>): CvSelection {
  const selection: CvSelection = readSearchFilters(search)
  for (const key of ['people', 'lang', 'birth', 'layout'] as const) {
    const one = v.safeParse(Extra.entries[key], search[key])
    if (one.success && one.output !== undefined) Object.assign(selection, { [key]: one.output })
  }
  return selection
}

// Whether the selection keeps only some projects: a technology, role, or characteristic, or
// either end of a period.
export function isFiltered(selection: CvSelection): boolean {
  return (
    [selection.t, selection.r, selection.c].some((ids) => (ids?.length ?? 0) > 0) ||
    selection.from !== undefined ||
    selection.to !== undefined
  )
}

// The CV read's input. Search's match is left out: it only picks people, and here they are
// already picked.
export function cvInput(selection: CvSelection): CvInput {
  return {
    profileIds: selection.people ?? [],
    language: selection.lang ?? 'et',
    technologyIds: selection.t ?? [],
    roleIds: selection.r ?? [],
    criterionIds: selection.c ?? [],
    from: selection.from ?? null,
    to: selection.to ?? null,
    birthDate: selection.birth ?? false,
  }
}
