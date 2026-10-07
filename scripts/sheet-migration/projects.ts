// Loads the Projektid sheet into an organization: customers, contact persons, projects,
// their technologies, and their answers to the technical characteristics
// (docs/architecture.md, "From the sheet"). Runs inside the migration's transaction, as the
// system user. A re-run finds what an earlier run added, so it updates instead of
// duplicating: projects by their sheet number (import_ref), customers and contact persons
// by name, technologies and characteristics by normalized name. Links are only added, so a
// technology an admin added in the app since stays.
import { and, eq, inArray } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'
import type { Executor } from '#/db'
import {
  contactPerson,
  customer,
  project,
  projectContact,
  projectCriterionAnswer,
  projectTechnology,
  technology,
  technologyCategory,
  tenderCriterion,
} from '#/db/schema'
import { normalizeName } from '#/lib/normalize-name'
import type { SheetTechnology } from './parse'
import type { SheetAnswer, SheetProject } from './read'
import type { Report } from './report'

const SHEET = 'Projektid'

type Counts = { added: number; updated: number }

export type ProjectsLoaded = {
  // Project IDs by sheet number, for participations to find their project.
  byNumber: Map<number, string>
  projects: Counts
  customers: number
  contacts: number
  technologies: number
  criteria: number
}

// A contact cell's line: a name, and an email or a phone if it has them.
export function splitContact(
  line: string,
): { name: string; email: string | null; phone: string | null } | null {
  let rest = line
  const email = /[^\s,;/()<>]+@[^\s,;/()<>]+\.[^\s,;/()<>]+/.exec(rest)?.[0] ?? null
  if (email) rest = rest.replace(email, ' ')
  const phone = /\+?\d[\d\s-]{5,}\d/.exec(rest)?.[0]?.trim() ?? null
  if (phone) rest = rest.replace(phone, ' ')
  const name = rest
    .replace(/[,;/()<>]|\b(?:tel|telefon|email|e-post)\b:?/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return name ? { name, email: email?.toLowerCase() ?? null, phone } : null
}

// An answer as the sheet writes it: yes and no, or a detail ("REST", "Mõlemad",
// "Jah (REST)") that reads as yes, with the detail kept in the note.
export function readAnswer(text: string): { answer: boolean; note: string | null } {
  const trimmed = text.trim()
  if (/^(?:jah|yes|✅|x)$/i.test(trimmed)) return { answer: true, note: null }
  if (/^(?:ei|no|❌|-)$/i.test(trimmed)) return { answer: false, note: null }
  return { answer: !/^(?:ei|no)\b/i.test(trimmed), note: trimmed }
}

// Live technologies by normalized name; a merged entry's name leads to the one it was
// merged into, so the sheet's old spellings land on the survivor.
async function technologyIndex(tx: Executor, organizationId: string) {
  const rows = await tx
    .select({
      id: technology.id,
      normalizedName: technology.normalizedName,
      mergedIntoId: technology.mergedIntoId,
      sysDeleted: technology.sysDeleted,
    })
    .from(technology)
    .where(eq(technology.organizationId, organizationId))
  const byId = new Map(rows.map((row) => [row.id, row]))
  function survivor(id: string): string | null {
    const seen = new Set<string>()
    for (let row = byId.get(id); row; row = byId.get(row.mergedIntoId ?? '')) {
      if (!row.sysDeleted) return row.id
      if (!row.mergedIntoId || seen.has(row.id)) return null
      seen.add(row.id)
    }
    return null
  }
  const index = new Map<string, string>()
  // Live names first, so a merged entry never shadows a live one with the same name.
  for (const row of [...rows].sort((a, b) => Number(a.sysDeleted) - Number(b.sysDeleted))) {
    if (index.has(row.normalizedName)) continue
    const id = survivor(row.id)
    if (id) index.set(row.normalizedName, id)
  }
  return index
}

// The category a new technology goes in: the one the sheet's prefix names ("Frontend:"),
// in either language, or "Other".
async function categoryPicker(tx: Executor, organizationId: string) {
  const categories = await tx
    .select({
      id: technologyCategory.id,
      nameEt: technologyCategory.nameEt,
      nameEn: technologyCategory.nameEn,
    })
    .from(technologyCategory)
    .where(
      and(
        eq(technologyCategory.organizationId, organizationId),
        eq(technologyCategory.sysDeleted, false),
      ),
    )
    .orderBy(technologyCategory.position)
  function named(name: string) {
    const wanted = normalizeName(name)
    return categories.find((each) =>
      [each.nameEt, each.nameEn].some((option) => option && normalizeName(option) === wanted),
    )
  }
  const fallback = named('Other') ?? named('Muu') ?? categories.at(-1)
  if (!fallback) throw new Error('The organization has no technology categories.')
  return (category: string | null) => (category ? named(category) : undefined) ?? fallback
}

async function criterionIndex(tx: Executor, organizationId: string) {
  const rows = await tx
    .select({
      id: tenderCriterion.id,
      nameEt: tenderCriterion.nameEt,
      nameEn: tenderCriterion.nameEn,
      position: tenderCriterion.position,
    })
    .from(tenderCriterion)
    .where(
      and(
        eq(tenderCriterion.organizationId, organizationId),
        eq(tenderCriterion.sysDeleted, false),
      ),
    )
  const index = new Map<string, string>()
  for (const row of rows) {
    for (const name of [row.nameEt, row.nameEn]) {
      if (name) index.set(normalizeName(name), row.id)
    }
  }
  return { index, position: Math.max(-1, ...rows.map((row) => row.position)) + 1 }
}

export async function loadProjects(
  tx: Executor,
  organizationId: string,
  sheetProjects: SheetProject[],
  report: Report,
): Promise<ProjectsLoaded> {
  const loaded: ProjectsLoaded = {
    byNumber: new Map(),
    projects: { added: 0, updated: 0 },
    customers: 0,
    contacts: 0,
    technologies: 0,
    criteria: 0,
  }
  const technologies = await technologyIndex(tx, organizationId)
  const categoryFor = await categoryPicker(tx, organizationId)
  const criteria = await criterionIndex(tx, organizationId)

  async function technologyId({ name, category }: SheetTechnology) {
    const normalized = normalizeName(name)
    const found = technologies.get(normalized)
    if (found) return found
    const id = uuidv7()
    await tx.insert(technology).values({
      id,
      organizationId,
      categoryId: categoryFor(category).id,
      name,
      normalizedName: normalized,
    })
    technologies.set(normalized, id)
    loaded.technologies++
    return id
  }

  async function criterionId(name: string) {
    const normalized = normalizeName(name)
    const found = criteria.index.get(normalized)
    if (found) return found
    const id = uuidv7()
    await tx
      .insert(tenderCriterion)
      .values({ id, organizationId, nameEt: name.trim(), position: criteria.position++ })
    criteria.index.set(normalized, id)
    loaded.criteria++
    return id
  }

  async function customerId(name: string) {
    const [found] = await tx
      .select({ id: customer.id })
      .from(customer)
      .where(
        and(
          eq(customer.organizationId, organizationId),
          eq(customer.name, name),
          eq(customer.sysDeleted, false),
        ),
      )
    if (found) return found.id
    const id = uuidv7()
    await tx.insert(customer).values({ id, organizationId, name })
    loaded.customers++
    return id
  }

  async function contactIds(sheetProject: SheetProject, ofCustomer: string | null) {
    if (!sheetProject.contact) return []
    if (!ofCustomer) {
      report.add({
        sheet: SHEET,
        cell: sheetProject.cell,
        value: sheetProject.contact,
        reason: 'A contact person needs the project’s customer; add both in the app.',
      })
      return []
    }
    const existing = await tx
      .select({ id: contactPerson.id, name: contactPerson.name })
      .from(contactPerson)
      .where(
        and(
          eq(contactPerson.organizationId, organizationId),
          eq(contactPerson.customerId, ofCustomer),
          eq(contactPerson.sysDeleted, false),
        ),
      )
    const ids: string[] = []
    for (const line of sheetProject.contact.split(/\n+/)) {
      if (!line.trim()) continue
      const contact = splitContact(line)
      if (!contact) {
        report.add({
          sheet: SHEET,
          cell: sheetProject.cell,
          value: line,
          reason: 'No contact person’s name; add them in the app.',
        })
        continue
      }
      const found = existing.find(
        (each) => normalizeName(each.name) === normalizeName(contact.name),
      )
      if (found) {
        await tx
          .update(contactPerson)
          .set({ email: contact.email, phone: contact.phone })
          .where(eq(contactPerson.id, found.id))
        ids.push(found.id)
      } else {
        const id = uuidv7()
        await tx
          .insert(contactPerson)
          .values({ id, organizationId, customerId: ofCustomer, ...contact })
        existing.push({ id, name: contact.name })
        loaded.contacts++
        ids.push(id)
      }
    }
    return ids
  }

  const importRefs = sheetProjects.map((each) => String(each.number))
  const stored = new Map(
    (importRefs.length === 0
      ? []
      : await tx
          .select({ id: project.id, importRef: project.importRef })
          .from(project)
          .where(
            and(
              eq(project.organizationId, organizationId),
              eq(project.sysDeleted, false),
              inArray(project.importRef, importRefs),
            ),
          )
    ).map((row) => [row.importRef, row.id]),
  )

  for (const sheetProject of sheetProjects) {
    if (!sheetProject.period) {
      report.add({
        sheet: SHEET,
        cell: sheetProject.cell,
        value: sheetProject.name,
        reason: 'Not loaded: the project needs a readable start date.',
      })
      continue
    }
    const ofCustomer = sheetProject.customer ? await customerId(sheetProject.customer) : null
    const values = {
      customerId: ofCustomer,
      name: sheetProject.name,
      normalizedName: normalizeName(sheetProject.name),
      descriptionEt: sheetProject.description,
      startDate: sheetProject.period.startDate,
      endDate: sheetProject.period.endDate,
      tenderReference: sheetProject.tenderReference,
      totalHours: sheetProject.totalHours?.value ?? null,
      totalHoursQualifier: sheetProject.totalHours?.qualifier ?? null,
      cost: sheetProject.cost?.value ?? null,
      costQualifier: sheetProject.cost?.qualifier ?? null,
    }
    const importRef = String(sheetProject.number)
    let projectId = stored.get(importRef)
    if (projectId) {
      await tx.update(project).set(values).where(eq(project.id, projectId))
      loaded.projects.updated++
    } else {
      projectId = uuidv7()
      await tx.insert(project).values({ id: projectId, organizationId, importRef, ...values })
      stored.set(importRef, projectId)
      loaded.projects.added++
    }
    loaded.byNumber.set(sheetProject.number, projectId)

    for (const contactPersonId of await contactIds(sheetProject, ofCustomer)) {
      await tx
        .insert(projectContact)
        .values({ projectId, contactPersonId, organizationId })
        .onConflictDoNothing()
    }
    for (const sheetTechnology of sheetProject.technologies) {
      await tx
        .insert(projectTechnology)
        .values({ projectId, technologyId: await technologyId(sheetTechnology), organizationId })
        .onConflictDoNothing()
    }
    await loadAnswers(tx, organizationId, projectId, sheetProject.answers, criterionId)
  }
  return loaded
}

async function loadAnswers(
  tx: Executor,
  organizationId: string,
  projectId: string,
  answers: SheetAnswer[],
  criterionId: (name: string) => Promise<string>,
) {
  const stored = await tx
    .select({ criterionId: projectCriterionAnswer.criterionId })
    .from(projectCriterionAnswer)
    .where(eq(projectCriterionAnswer.projectId, projectId))
  const answered = new Set(stored.map((row) => row.criterionId))
  for (const sheetAnswer of answers) {
    const id = await criterionId(sheetAnswer.criterion)
    const value = readAnswer(sheetAnswer.answer)
    if (answered.has(id)) {
      await tx
        .update(projectCriterionAnswer)
        .set(value)
        .where(
          and(
            eq(projectCriterionAnswer.projectId, projectId),
            eq(projectCriterionAnswer.criterionId, id),
          ),
        )
    } else {
      await tx
        .insert(projectCriterionAnswer)
        .values({ projectId, criterionId: id, organizationId, ...value })
      answered.add(id)
    }
  }
}
