import { normalizeName } from '#/lib/normalize-name'
// Generates one fictional organization's rows from a seed. A pure function: the same seed
// and spec give the same rows on any day, because every date derives from DEMO_NOW and the
// seed, never from the clock. src/db/seed.ts lists the organizations and loads the rows.
import type {
  contactPerson,
  customer,
  education,
  employeeProfile,
  member,
  organization,
  ownProject,
  ownProjectRole,
  ownProjectTechnology,
  participation,
  participationRole,
  participationTechnology,
  project,
  projectContact,
  projectCriterionAnswer,
  projectRole,
  projectTechnology,
  QUALIFIERS,
  technology,
  technologyCategory,
  tenderCriterion,
  updateRequest,
  user,
} from '../schema'
import { createRandom } from './random'
import {
  type Bilingual,
  CATEGORIES,
  CONTACT_NOTES,
  CRITERIA,
  CUSTOMERS,
  DEGREES,
  FIELDS,
  FIRST_NAMES,
  FORMER_EMPLOYERS,
  INSTITUTIONS,
  INTERNAL_PROJECTS,
  LAST_NAMES,
  MERGED_TECHNOLOGY,
  PROJECT_SCOPES,
  ROLES,
  SYSTEMS,
  TECHNOLOGY_NOTES,
  UPDATE_REQUEST_MESSAGES,
} from './vocabulary'

// The moment the demo data describes: "now" for ongoing periods, confirmations, and open
// requests, so counts and periods don't drift with the calendar.
export const DEMO_NOW = new Date('2026-09-01T09:00:00Z')

// A user from task 006.2's dev accounts who belongs to the organization. With a profile,
// they also get participations, and an employee gets an open update request.
type DevMember = {
  id: string
  name: string
  role: 'admin' | 'employee'
  profile: boolean
}

export type OrganizationSpec = {
  id: string
  slug: string
  name: string
  // Also the time its memberships start; a user's earliest membership is active at sign-in.
  createdAt: Date
  customers: number
  projects: number
  employees: number
  // How many participations each person with a profile gets, as [min, max].
  participations?: readonly [number, number]
  devMembers: readonly DevMember[]
}

export type DemoOrganization = ReturnType<typeof generateOrganization>

type Qualifier = (typeof QUALIFIERS)[number]

const DAY_MS = 24 * 60 * 60 * 1000
const EN_MISSING = 0.15
const ET_MISSING = 0.03

// Months count from year 0, so period arithmetic is plain integers.
const NOW_MONTH = DEMO_NOW.getUTCFullYear() * 12 + DEMO_NOW.getUTCMonth()

function pad(n: number) {
  return n.toString().padStart(2, '0')
}

function monthText(month: number) {
  return `${Math.floor(month / 12)}-${pad((month % 12) + 1)}`
}

function yearText(month: number) {
  return `${Math.floor(month / 12)}`
}

function daysBefore(days: number) {
  return new Date(DEMO_NOW.getTime() - days * DAY_MS)
}

// ASCII for email addresses and domains: "Põhjaranniku Vesi" becomes "pohjaranniku-vesi".
function slugify(text: string) {
  return text
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

type Period = { start: number; end: number | null }

// How many technologies a project takes from each of CATEGORIES, as [min, max]: a
// believable stack, with more from the backend, data, and infrastructure.
const STACK_COUNTS: readonly [number, number][] = [
  [0, 2],
  [1, 2],
  [1, 2],
  [1, 3],
  [0, 2],
  [0, 1],
]

function overlaps(a: Period, b: Period) {
  return a.start <= (b.end ?? NOW_MONTH) && b.start <= (a.end ?? NOW_MONTH)
}

export function generateOrganization(seed: number, spec: OrganizationSpec) {
  const random = createRandom(seed, spec.slug)
  const at = DEMO_NOW
  const audit = { createdAt: at, updatedAt: at }

  function id() {
    return random.uuid(at)
  }

  // Bilingual text with a translation sometimes missing, as people enter it.
  function text(value: Bilingual) {
    if (random.chance(ET_MISSING)) return { et: null, en: value.en }
    return { et: value.et, en: random.chance(EN_MISSING) ? null : value.en }
  }

  function approximate(value: number, roundTo: number) {
    const rounded = Math.max(roundTo, Math.round(value / roundTo) * roundTo)
    const qualifier: Qualifier = random.pick([
      'approximately',
      'approximately',
      'exact',
      'more_than',
    ])
    return { value: rounded, qualifier }
  }

  const organizationRow: typeof organization.$inferInsert = {
    id: spec.id,
    name: spec.name,
    slug: spec.slug,
    createdAt: spec.createdAt,
  }

  // Catalogue ------------------------------------------------------------------------------

  const technologyCategories: (typeof technologyCategory.$inferInsert)[] = []
  const technologies: (typeof technology.$inferInsert)[] = []
  const byCategory: string[][] = []
  for (const [position, category] of CATEGORIES.entries()) {
    const categoryId = id()
    technologyCategories.push({
      id: categoryId,
      organizationId: spec.id,
      nameEt: category.name.et,
      nameEn: category.name.en,
      position,
      ...audit,
    })
    // Each organization's catalogue holds most of the list, always PostgreSQL.
    const names = category.technologies.filter(
      (name) => name === MERGED_TECHNOLOGY[1] || random.chance(0.8),
    )
    const ids: string[] = []
    for (const name of names) {
      const technologyId = id()
      ids.push(technologyId)
      technologies.push({
        id: technologyId,
        organizationId: spec.id,
        categoryId,
        name,
        normalizedName: normalizeName(name),
        note: TECHNOLOGY_NOTES[name] ?? null,
        ...audit,
      })
      if (name === MERGED_TECHNOLOGY[1]) {
        technologies.push({
          id: id(),
          organizationId: spec.id,
          categoryId,
          name: MERGED_TECHNOLOGY[0],
          normalizedName: normalizeName(MERGED_TECHNOLOGY[0]),
          mergedIntoId: technologyId,
          sysDeleted: true,
          ...audit,
        })
      }
    }
    byCategory.push(ids)
  }

  const usableTechnologies = technologies.filter((row) => !row.mergedIntoId).map((row) => row.id)

  function pickStack() {
    return byCategory.flatMap((ids, i) => {
      const [min, max] = STACK_COUNTS[i] ?? [0, 1]
      return random.sample(ids, random.int(min, max))
    })
  }

  const tenderCriteria: (typeof tenderCriterion.$inferInsert)[] = CRITERIA.map(
    (criterion, position) => ({
      id: id(),
      organizationId: spec.id,
      nameEt: criterion.name.et,
      nameEn: criterion.name.en,
      position,
      ...audit,
    }),
  )

  // The role catalogue: Estonian names always, English ones sometimes missing, as after the
  // sheet migration.
  const roleCatalogue = ROLES.map((role) => ({
    tasks: role.tasks,
    row: {
      id: id(),
      organizationId: spec.id,
      nameEt: role.name.et,
      nameEn: random.chance(EN_MISSING) ? null : role.name.en,
      normalizedName: normalizeName(role.name.et),
      ...audit,
    } satisfies typeof projectRole.$inferInsert,
  }))
  const projectRoles = roleCatalogue.map((entry) => entry.row)

  // One role, sometimes two; the first decides the tasks.
  function pickRoles() {
    const picked = random.sample(roleCatalogue, random.chance(0.15) ? 2 : 1)
    return { tasks: picked[0]?.tasks ?? [], ids: picked.map((entry) => entry.row.id) }
  }

  // Customers -------------------------------------------------------------------------------

  const pickedCustomers = random.sample(CUSTOMERS, spec.customers).map((picked) => ({
    ...picked,
    id: id(),
  }))
  const customers: (typeof customer.$inferInsert)[] = pickedCustomers.map((picked) => ({
    id: picked.id,
    organizationId: spec.id,
    name: picked.name,
    ...audit,
  }))

  const usedNames = new Set<string>()
  function personName() {
    for (;;) {
      const first = random.pick(FIRST_NAMES)
      const last = random.pick(LAST_NAMES)
      const name = `${first} ${last}`
      if (usedNames.has(name)) continue
      usedNames.add(name)
      return { name, local: `${slugify(first)}.${slugify(last)}` }
    }
  }

  const contactPersons: (typeof contactPerson.$inferInsert)[] = []
  const contactsByCustomer = new Map<string, string[]>()
  for (const owner of pickedCustomers) {
    const ids: string[] = []
    for (let i = random.int(1, 3); i > 0; i--) {
      const person = personName()
      const noLongerValid = random.chance(0.15)
      const contactId = id()
      ids.push(contactId)
      contactPersons.push({
        id: contactId,
        organizationId: spec.id,
        customerId: owner.id,
        name: person.name,
        email: `${person.local}@${slugify(owner.short)}.example.com`,
        phone: random.chance(0.7) ? `+372 5555 ${random.int(1000, 9999)}` : null,
        noLongerValid,
        note: noLongerValid
          ? CONTACT_NOTES.left
          : random.chance(0.2)
            ? random.pick(CONTACT_NOTES.other)
            : null,
        ...audit,
      })
    }
    contactsByCustomer.set(owner.id, ids)
  }

  // Projects ----------------------------------------------------------------------------

  const projects: (typeof project.$inferInsert)[] = []
  const projectPeriods = new Map<string, Period>()
  const projectStacks = new Map<string, string[]>()
  const projectContacts: (typeof projectContact.$inferInsert)[] = []
  const projectTechnologies: (typeof projectTechnology.$inferInsert)[] = []
  const projectCriterionAnswers: (typeof projectCriterionAnswer.$inferInsert)[] = []
  const projectNames = new Set<string>()

  for (let i = 0; i < spec.projects; i++) {
    const owner = random.chance(0.9) ? random.pick(pickedCustomers) : null
    const system = owner ? random.pick(SYSTEMS) : random.pick(INTERNAL_PROJECTS)
    let name = owner ? `${owner.short} ${system.name}` : system.name
    // A customer often orders the same kind of system twice; the second is a new phase.
    for (let phase = 2; projectNames.has(name); phase++) {
      name = `${owner ? `${owner.short} ${system.name}` : system.name} ${phase}`
    }
    projectNames.add(name)

    const start = random.int(NOW_MONTH - 10 * 12, NOW_MONTH - 1)
    const ongoing = start > NOW_MONTH - 48 && random.chance(0.3)
    const end = ongoing ? null : Math.min(start + random.int(2, 30), NOW_MONTH - 1)
    const period: Period = { start, end }

    // Mostly months, as the sheet has them; some years, and some exact days from the app.
    const precision = random.pick(['month', 'month', 'month', 'month', 'year', 'day'] as const)
    const startDate =
      precision === 'year'
        ? yearText(start)
        : precision === 'day'
          ? `${monthText(start)}-${pad(random.int(1, 15))}`
          : monthText(start)
    const endDate =
      end === null
        ? null
        : precision === 'year'
          ? yearText(end)
          : precision === 'day'
            ? `${monthText(end)}-${pad(random.int(16, 28))}`
            : monthText(end)

    const months = (end ?? NOW_MONTH) - start + 1
    const hours = random.chance(0.8) ? approximate(months * random.int(200, 800), 100) : null
    const cost =
      hours && random.chance(0.8) ? approximate(hours.value * random.int(55, 85), 1000) : null
    const scope = owner ? random.pick(PROJECT_SCOPES) : null
    const description = text({
      et: scope ? `${system.description.et} ${scope.et}` : system.description.et,
      en: scope ? `${system.description.en} ${scope.en}` : system.description.en,
    })

    const projectId = id()
    projects.push({
      id: projectId,
      organizationId: spec.id,
      customerId: owner?.id ?? null,
      name,
      normalizedName: normalizeName(name),
      descriptionEt: description.et,
      descriptionEn: description.en,
      startDate,
      endDate,
      tenderReference: owner && random.chance(0.6) ? `${random.int(200000, 299999)}` : null,
      totalHours: hours?.value ?? null,
      totalHoursQualifier: hours?.qualifier ?? null,
      cost: cost?.value ?? null,
      costQualifier: cost?.qualifier ?? null,
      ...audit,
    })
    projectPeriods.set(projectId, period)

    if (owner) {
      const contacts = contactsByCustomer.get(owner.id) ?? []
      for (const contactPersonId of random.sample(contacts, random.int(0, 2))) {
        projectContacts.push({ projectId, contactPersonId, organizationId: spec.id, createdAt: at })
      }
    }

    const stack = pickStack()
    projectStacks.set(projectId, stack)
    for (const technologyId of stack) {
      projectTechnologies.push({ projectId, technologyId, organizationId: spec.id, createdAt: at })
    }

    const answered = random.sample([...CRITERIA.keys()], random.int(3, CRITERIA.length))
    for (const index of answered) {
      const notes = CRITERIA[index]?.notes ?? []
      const criterionId = tenderCriteria[index]?.id
      if (!criterionId) continue
      projectCriterionAnswers.push({
        projectId,
        criterionId,
        organizationId: spec.id,
        answer: random.chance(0.7),
        note: notes.length > 0 && random.chance(0.3) ? random.pick(notes) : null,
        ...audit,
      })
    }
  }

  // People ------------------------------------------------------------------------------

  const users: (typeof user.$inferInsert)[] = []
  const members: (typeof member.$inferInsert)[] = []
  const employeeProfiles: (typeof employeeProfile.$inferInsert)[] = []
  const educations: (typeof education.$inferInsert)[] = []
  const participations: (typeof participation.$inferInsert)[] = []
  const participationTechnologies: (typeof participationTechnology.$inferInsert)[] = []
  const participationRoles: (typeof participationRole.$inferInsert)[] = []
  const ownProjects: (typeof ownProject.$inferInsert)[] = []
  const ownProjectTechnologies: (typeof ownProjectTechnology.$inferInsert)[] = []
  const ownProjectRoles: (typeof ownProjectRole.$inferInsert)[] = []
  const updateRequests: (typeof updateRequest.$inferInsert)[] = []

  type Person = { userId: string; name: string; role: 'admin' | 'employee'; dev: boolean }
  const people: Person[] = spec.devMembers.map((dev) => ({
    userId: dev.id,
    name: dev.name,
    role: dev.role,
    dev: true,
  }))
  for (const dev of spec.devMembers) {
    members.push({
      id: id(),
      organizationId: spec.id,
      userId: dev.id,
      role: dev.role,
      createdAt: spec.createdAt,
    })
  }
  for (let i = 0; i < spec.employees; i++) {
    const person = personName()
    const userId = id()
    users.push({
      id: userId,
      name: person.name,
      email: `${person.local}@${spec.slug}.example.com`,
      emailVerified: true,
      createdAt: spec.createdAt,
      updatedAt: spec.createdAt,
    })
    // The first generated employee runs the organization alongside any dev admin.
    people.push({ userId, name: person.name, role: i === 0 ? 'admin' : 'employee', dev: false })
  }
  const requester = people.find((person) => person.role === 'admin')?.userId
  if (!requester) throw new Error(`${spec.slug} has no admin to request updates`)

  const withProfile = people.filter(
    (person) =>
      !person.dev || spec.devMembers.some((dev) => dev.id === person.userId && dev.profile),
  )
  for (const person of withProfile) {
    // Dev users and admins stay; about one in ten others has left.
    const leaver = !person.dev && person.role !== 'admin' && random.chance(0.1)
    const join = random.int(NOW_MONTH - 12 * 12, NOW_MONTH - 8)
    const left = leaver ? random.int(join + 6, NOW_MONTH - 1) : null
    const employment: Period = { start: join, end: left }

    if (!person.dev && !leaver) {
      members.push({
        id: id(),
        organizationId: spec.id,
        userId: person.userId,
        role: person.role,
        createdAt: spec.createdAt,
      })
    }

    const profileId = id()
    const profile: typeof employeeProfile.$inferInsert = {
      id: profileId,
      organizationId: spec.id,
      userId: person.userId,
      fullName: person.name,
      joinDate: `${monthText(join)}-${pad(random.int(1, 28))}`,
      leftDate: left === null ? null : `${monthText(left)}-${pad(random.int(1, 28))}`,
      birthDate: random.chance(0.5)
        ? `${random.int(1965, 2001)}-${pad(random.int(1, 12))}-${pad(random.int(1, 28))}`
        : null,
      confirmedAt: null,
      ...audit,
    }
    employeeProfiles.push(profile)

    // Education ends before the person joins.
    const graduated = Math.floor(join / 12) - random.int(0, 12)
    let studyEnd = graduated
    for (let i = random.int(0, 2); i > 0; i--) {
      const degree = random.pick(DEGREES)
      const institution = text(random.pick(INSTITUTIONS))
      const field = text(random.pick(FIELDS))
      const degreeName = text(degree.name)
      educations.push({
        id: id(),
        organizationId: spec.id,
        profileId,
        institutionEt: institution.et,
        institutionEn: institution.en,
        fieldEt: field.et,
        fieldEn: field.en,
        degreeEt: degreeName.et,
        degreeEn: degreeName.en,
        startDate: `${studyEnd - degree.years}`,
        endDate: `${studyEnd}`,
        ...audit,
      })
      studyEnd -= degree.years
    }

    // Participations: projects that ran while the person worked here. Several at once is
    // normal, so periods overlap.
    const candidates = projects.filter((row) => {
      const period = projectPeriods.get(row.id)
      return period !== undefined && overlaps(period, employment)
    })
    const [fewest, most] = spec.participations ?? [2, 5]
    for (const row of random.sample(candidates, random.int(fewest, most))) {
      const projectPeriod = projectPeriods.get(row.id)
      if (!projectPeriod) continue
      const from = Math.max(projectPeriod.start, employment.start)
      const until = Math.min(projectPeriod.end ?? NOW_MONTH, employment.end ?? NOW_MONTH)
      const start = random.int(from, until)
      const ongoing = projectPeriod.end === null && left === null && random.chance(0.6)
      const end = ongoing ? null : random.int(start, until)
      const roles = pickRoles()
      const picked = random.sample(roles.tasks, random.int(1, 2))
      const tasks = text({
        et: picked.map((task) => task.et).join(' '),
        en: picked.map((task) => task.en).join(' '),
      })
      const hours = random.chance(0.85)
        ? approximate(((end ?? NOW_MONTH) - start + 1) * random.int(40, 140), 10)
        : null

      const participationId = id()
      participations.push({
        id: participationId,
        organizationId: spec.id,
        profileId,
        projectId: row.id,
        startDate: monthText(start),
        endDate: end === null ? null : monthText(end),
        hours: hours?.value ?? null,
        hoursQualifier: hours?.qualifier ?? null,
        tasksEt: tasks.et,
        tasksEn: tasks.en,
        ...audit,
      })
      for (const roleId of roles.ids) {
        participationRoles.push({
          participationId,
          roleId,
          organizationId: spec.id,
          createdAt: at,
        })
      }

      // Most of the project's stack, sometimes with something the project didn't list.
      const stack = projectStacks.get(row.id) ?? []
      const used = random.sample(stack, random.int(1, Math.min(4, stack.length)))
      if (random.chance(0.15)) {
        const extra = random.pick(usableTechnologies)
        if (!used.includes(extra)) used.push(extra)
      }
      for (const technologyId of used) {
        participationTechnologies.push({
          participationId,
          technologyId,
          organizationId: spec.id,
          createdAt: at,
        })
      }
    }

    // Own projects, from earlier employers.
    if (random.chance(0.4)) {
      let before = join - 1
      for (let i = random.int(1, 2); i > 0; i--) {
        const end = before - random.int(0, 6)
        const start = end - random.int(3, 36)
        before = start - 1
        const system = random.pick(SYSTEMS)
        const formerCustomer = random.pick(CUSTOMERS)
        const description = text(system.description)
        const roles = pickRoles()
        const tasks = text(random.pick(roles.tasks))
        const hours = approximate((end - start + 1) * random.int(60, 140), 10)
        const ownProjectId = id()
        ownProjects.push({
          id: ownProjectId,
          organizationId: spec.id,
          profileId,
          name: `${formerCustomer.short} ${system.name}`,
          employer: random.chance(0.85) ? random.pick(FORMER_EMPLOYERS) : null,
          customerName: formerCustomer.name,
          descriptionEt: description.et,
          descriptionEn: description.en,
          startDate: monthText(start),
          endDate: monthText(end),
          hours: hours.value,
          hoursQualifier: hours.qualifier,
          tasksEt: tasks.et,
          tasksEn: tasks.en,
          ...audit,
        })
        for (const roleId of roles.ids) {
          ownProjectRoles.push({ ownProjectId, roleId, organizationId: spec.id, createdAt: at })
        }
        for (const technologyId of random.sample(usableTechnologies, random.int(2, 4))) {
          ownProjectTechnologies.push({
            ownProjectId,
            technologyId,
            organizationId: spec.id,
            createdAt: at,
          })
        }
      }
    }

    // Update requests: a dev employee always has one open, so the sign-in notice shows.
    if (leaver || person.userId === requester) continue
    const devEmployee = person.dev && person.role === 'employee'
    const outcome = devEmployee
      ? 'open'
      : random.pick(['open', 'confirmed', 'confirmed', 'canceled', 'none', 'none'] as const)
    if (outcome === 'none') {
      if (random.chance(0.5)) profile.confirmedAt = daysBefore(random.int(20, 400))
      continue
    }
    const requestedAt = daysBefore(
      random.int(outcome === 'open' ? 1 : 30, outcome === 'open' ? 20 : 300),
    )
    const closedAt =
      outcome === 'open' ? null : new Date(requestedAt.getTime() + random.int(1, 14) * DAY_MS)
    if (outcome === 'confirmed') profile.confirmedAt = closedAt
    updateRequests.push({
      id: random.uuid(requestedAt),
      organizationId: spec.id,
      profileId,
      message: random.pick(UPDATE_REQUEST_MESSAGES),
      closedAt,
      closedReason: outcome === 'open' ? null : outcome,
      createdAt: requestedAt,
      createdBy: requester,
      updatedAt: closedAt ?? requestedAt,
      updatedBy: outcome === 'confirmed' ? person.userId : requester,
    })
  }

  return {
    organization: organizationRow,
    users,
    members,
    technologyCategories,
    technologies,
    tenderCriteria,
    projectRoles,
    customers,
    contactPersons,
    projects,
    projectContacts,
    projectTechnologies,
    projectCriterionAnswers,
    employeeProfiles,
    educations,
    participations,
    participationTechnologies,
    participationRoles,
    ownProjects,
    ownProjectTechnologies,
    ownProjectRoles,
    updateRequests,
  }
}
