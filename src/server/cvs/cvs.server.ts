// The CV read (docs/product.md, "CV selection" and "Bilingual content"): what a CV of the
// chosen people says, in the chosen language. The selection page, the table, and the DOCX
// document all render it. A project several of the people worked on is listed once, with
// each person's part. Text missing in the chosen language falls back to the other,
// marked, and the read lists it so it can be fixed before the CV goes out.
import type { Database } from '#/db'
import type { ApproximateNumber, Qualifier } from '#/lib/approximate-number'
import { overlaps } from '#/lib/period'
import { requirePermission, type Scope } from '../scope.server'
import {
  ownProjectRoles,
  ownProjectTechnologies,
  participationRoles,
  participationTechnologies,
} from '../search/search.repository.server'
import { matchingWork } from '../search/search.server'
import * as repository from './cvs.repository.server'
import type { CvInput } from './cvs.schemas'

type Language = CvInput['language']

// Text in the CV's language, or the other one marked as a fallback.
export type CvText = { text: string; lang: Language; fallback: boolean }

// Where a missing translation is fixed: the project's form, the role catalogue, or, for
// what only the person edits, the People page, where an admin asks them to update it.
type CvFix = { page: 'project'; projectId: string } | { page: 'roles' } | { page: 'people' }

export type CvMissing = {
  field: 'project_description' | 'own_project_description' | 'tasks' | 'role' | 'education'
  // What the field belongs to: a project, a role, or a person.
  name: string
  person: string | null
  fix: CvFix
}

function approximate(value: number | null, qualifier: Qualifier | null): ApproximateNumber | null {
  return value === null ? null : { value, qualifier: qualifier ?? 'exact' }
}

function grouped<T extends { itemId: string }>(rows: T[]) {
  const map = new Map<string, Omit<T, 'itemId'>[]>()
  for (const { itemId, ...rest } of rows) map.set(itemId, [...(map.get(itemId) ?? []), rest])
  return map
}

export async function cv(
  db: Database,
  scope: Scope,
  input: CvInput,
  today = new Date().toISOString().slice(0, 10),
) {
  requirePermission(scope, { cv: ['generate'] }, 'cv_forbidden')
  const language = input.language
  const other: Language = language === 'et' ? 'en' : 'et'
  const missing: CvMissing[] = []
  const seen = new Set<string>()

  // The text in the CV's language, or the other with a note of what is missing.
  function text(pair: { et: string | null; en: string | null }, gap: CvMissing): CvText | null {
    const own = pair[language]
    if (own) return { text: own, lang: language, fallback: false }
    const fallback = pair[other]
    if (!fallback) return null
    const key = `${gap.field}|${gap.name}|${gap.person ?? ''}`
    if (!seen.has(key)) {
      seen.add(key)
      missing.push(gap)
    }
    return { text: fallback, lang: other, fallback: true }
  }

  const [profiles, educationRows, participations, ownProjects] = await Promise.all([
    repository.cvProfiles(db, scope, input.profileIds),
    repository.cvEducation(db, scope, input.profileIds),
    repository.cvParticipations(db, scope, input.profileIds),
    repository.cvOwnProjects(db, scope, input.profileIds),
  ])
  const nameOf = new Map(profiles.map((profile) => [profile.id, profile.fullName]))
  const participationIds = participations.map((each) => each.id)
  const ownIds = ownProjects.map((each) => each.id)
  const [pRoles, oRoles, pTechnologies, oTechnologies] = await Promise.all([
    participationRoles(db, scope, participationIds),
    ownProjectRoles(db, scope, ownIds),
    participationTechnologies(db, scope, participationIds),
    ownProjectTechnologies(db, scope, ownIds),
  ])
  const rolesOf = new Map([...grouped(pRoles), ...grouped(oRoles)])
  const technologiesOf = new Map([...grouped(pTechnologies), ...grouped(oTechnologies)])

  // Null when nothing narrows: every piece of work is in, within the period.
  const matched = await matchingWork(db, scope, input, input.profileIds)
  const matchedIds = matched
    ? new Set([...matched.participations, ...matched.ownProjects].map((each) => each.id))
    : null
  function included(item: { id: string; startDate: string; endDate: string | null }) {
    if (matchedIds && !matchedIds.has(item.id)) return false
    return overlaps(item, input, today)
  }

  function part(item: (typeof participations)[number] | (typeof ownProjects)[number]) {
    const person = nameOf.get(item.profileId) ?? ''
    return {
      profileId: item.profileId,
      roles: (rolesOf.get(item.id) ?? []).flatMap(({ nameEt, nameEn }) => {
        const name = nameEt ?? nameEn ?? ''
        const shown = text(
          { et: nameEt, en: nameEn },
          { field: 'role', name, person: null, fix: { page: 'roles' } },
        )
        return shown ? [shown] : []
      }),
      startDate: item.startDate,
      endDate: item.endDate,
      hours: approximate(item.hours, item.hoursQualifier),
      tasks: text(
        { et: item.tasksEt, en: item.tasksEn },
        { field: 'tasks', name: item.name, person, fix: { page: 'people' } },
      ),
      technologies: (technologiesOf.get(item.id) ?? []).map((each) => each.name),
    }
  }

  // Organization projects, each once with every chosen person's parts in it.
  const byProject = new Map<string, ReturnType<typeof projectEntry>>()
  function projectEntry(row: (typeof participations)[number]) {
    return {
      key: `project:${row.projectId}`,
      kind: 'project' as const,
      projectId: row.projectId as string | null,
      name: row.name,
      employer: null as string | null,
      customerName: row.customerName,
      description: text(
        { et: row.descriptionEt, en: row.descriptionEn },
        {
          field: 'project_description',
          name: row.name,
          person: null,
          fix: { page: 'project', projectId: row.projectId },
        },
      ),
      parts: [] as ReturnType<typeof part>[],
    }
  }
  for (const row of participations.filter(included)) {
    const entry = byProject.get(row.projectId) ?? projectEntry(row)
    entry.parts.push(part(row))
    byProject.set(row.projectId, entry)
  }
  const own = ownProjects.filter(included).map((row) => ({
    key: `own:${row.id}`,
    kind: 'own' as const,
    projectId: null,
    name: row.name,
    employer: row.employer,
    customerName: row.customerName,
    description: text(
      { et: row.descriptionEt, en: row.descriptionEn },
      {
        field: 'own_project_description',
        name: row.name,
        person: nameOf.get(row.profileId) ?? '',
        fix: { page: 'people' },
      },
    ),
    parts: [part(row)],
  }))

  // Newest first, by the latest start of anyone's part.
  function latest(entry: { parts: { startDate: string }[] }) {
    return entry.parts.reduce((max, each) => (each.startDate > max ? each.startDate : max), '')
  }
  const projects = [...byProject.values(), ...own].sort((a, b) =>
    latest(b).localeCompare(latest(a)),
  )

  const people = input.profileIds.flatMap((id) => {
    const profile = profiles.find((each) => each.id === id)
    if (!profile) return []
    const person = profile.fullName
    const gap = { field: 'education' as const, person, fix: { page: 'people' as const } }
    return [
      {
        id: profile.id,
        fullName: profile.fullName,
        birthDate: input.birthDate ? profile.birthDate : null,
        education: educationRows
          .filter((row) => row.profileId === id)
          .map((row) => {
            const name = row.institutionEt ?? row.institutionEn ?? ''
            return {
              institution: text({ et: row.institutionEt, en: row.institutionEn }, { ...gap, name }),
              field: text({ et: row.fieldEt, en: row.fieldEn }, { ...gap, name }),
              degree: text({ et: row.degreeEt, en: row.degreeEn }, { ...gap, name }),
              startDate: row.startDate,
              endDate: row.endDate,
            }
          }),
      },
    ]
  })

  return { language, people, projects, missing }
}
