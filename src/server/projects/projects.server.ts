// Rules for projects (docs/product.md, "Projects" and "Data and privacy"). Every member
// sees the projects; tender details only admins and the project's participants. Admins
// create, edit, and delete them.
import type { Database, Executor } from '#/db'
import { SYSTEM_USER_ID } from '#/db/actor'
import type { ApproximateNumber, Qualifier } from '#/lib/approximate-number'
import { normalizeName } from '#/lib/normalize-name'
import { AppError } from '../errors'
import { hasPermission, requirePermission, type Scope } from '../scope.server'
import * as repository from './projects.repository.server'
import type {
  AddContactInput,
  ContactsInput,
  CreateProjectInput,
  DeleteContactInput,
  ProjectFields,
  ProjectInput,
  UpdateContactInput,
  UpdateProjectInput,
} from './projects.schemas'

function byProject<T extends { projectId: string }>(rows: T[]) {
  const grouped = new Map<string, Omit<T, 'projectId'>[]>()
  for (const { projectId, ...rest } of rows) {
    grouped.set(projectId, [...(grouped.get(projectId) ?? []), rest])
  }
  return grouped
}

function approximate(value: number | null, qualifier: Qualifier | null): ApproximateNumber | null {
  return value === null ? null : { value, qualifier: qualifier ?? 'exact' }
}

export async function projectList(db: Database, scope: Scope) {
  const [projects, technologies] = await Promise.all([
    repository.listProjects(db, scope),
    repository.listProjectTechnologies(db, scope),
  ])
  const technologiesOf = byProject(technologies)
  return projects.map((row) => ({ ...row, technologies: technologiesOf.get(row.id) ?? [] }))
}

type ProjectContact = Awaited<ReturnType<typeof repository.listProjectContacts>>[number]

// Admins see every contact with the admins' note on them. Participants see only the
// contacts who are still valid, and no notes: a former contact and why they stopped being
// one are the admins' business (docs/product.md, "Personal data and GDPR").
function visibleContacts(contacts: ProjectContact[], isAdmin: boolean) {
  if (isAdmin) return contacts
  return contacts
    .filter((contact) => !contact.noLongerValid)
    .map((contact) => ({ ...contact, note: null }))
}

export async function projectView(db: Database, scope: Scope, input: ProjectInput) {
  const found = await repository.findProject(db, scope, input.projectId)
  if (!found) throw new AppError('NOT_FOUND', 'project_not_found')
  const [technologies, criteria, people, roles] = await Promise.all([
    repository.listProjectTechnologies(db, scope, found.id),
    repository.listProjectCriteria(db, scope, found.id),
    repository.listProjectPeople(db, scope, found.id),
    repository.listProjectRoles(db, scope, found.id),
  ])
  const rolesOf = new Map<string, { et: string | null; en: string | null }[]>()
  for (const { participationId, nameEt, nameEn } of roles) {
    rolesOf.set(participationId, [
      ...(rolesOf.get(participationId) ?? []),
      { et: nameEt, en: nameEn },
    ])
  }
  const participations = people.map(({ userId, ...person }) => ({
    ...person,
    mine: userId === scope.userId,
    roles: rolesOf.get(person.participationId) ?? [],
  }))
  // Cost, hours, the tender reference, and the customer's contacts are for admins and the
  // people who took part. The others get none of it, not only a page that hides it.
  const isAdmin = hasPermission(scope, { project: ['update'] })
  const canSeeDetails = isAdmin || participations.some((each) => each.mine)
  const details = canSeeDetails
    ? {
        tenderReference: found.tenderReference,
        totalHours: approximate(found.totalHours, found.totalHoursQualifier),
        cost: approximate(found.cost, found.costQualifier),
        contacts: visibleContacts(
          await repository.listProjectContacts(db, scope, found.id),
          isAdmin,
        ),
      }
    : null
  return {
    id: found.id,
    name: found.name,
    customerName: found.customerName,
    description: { et: found.descriptionEt, en: found.descriptionEn },
    startDate: found.startDate,
    endDate: found.endDate,
    technologies: technologies.map(({ id, name }) => ({ id, name })),
    criteria: criteria.map(({ id, nameEt, nameEn, answer, note }) => ({
      id,
      name: { et: nameEt, en: nameEn },
      answer,
      note,
    })),
    people: participations,
    details,
    lastChange: lastChange(found),
  }
}

// The client names the system user in the UI language.
function lastChange(found: { updatedAt: Date; updatedById: string; updatedByName: string }) {
  return {
    at: found.updatedAt,
    by: found.updatedById === SYSTEM_USER_ID ? null : found.updatedByName,
  }
}

export function customers(db: Database, scope: Scope) {
  return repository.listCustomers(db, scope)
}

// The stored values for the edit form.
export async function projectForm(db: Database, scope: Scope, input: ProjectInput) {
  requirePermission(scope, { project: ['update'] }, 'project_forbidden')
  const found = await repository.findProject(db, scope, input.projectId)
  if (!found) throw new AppError('NOT_FOUND', 'project_not_found')
  const contacts = await repository.listProjectContacts(db, scope, found.id)
  return {
    id: found.id,
    name: found.name,
    customerId: found.customerId,
    contactIds: contacts.map((contact) => contact.id),
    description: { et: found.descriptionEt, en: found.descriptionEn },
    startDate: found.startDate,
    endDate: found.endDate,
    tenderReference: found.tenderReference,
    totalHours: approximate(found.totalHours, found.totalHoursQualifier),
    cost: approximate(found.cost, found.costQualifier),
    lastChange: lastChange(found),
  }
}

// The customer's ID, adding a new one first. A new customer whose name is already taken
// is the existing one, so two forms adding the same customer don't fail on the index.
async function resolveCustomer(db: Executor, scope: Scope, choice: ProjectFields['customer']) {
  if (choice === null) return null
  if (choice.kind === 'existing') {
    if (!(await repository.findCustomer(db, scope, choice.id))) {
      throw new AppError('INVALID', 'customer_not_found')
    }
    return choice.id
  }
  requirePermission(scope, { customer: ['create'] }, 'project_forbidden')
  const existing = await repository.findCustomerByName(db, scope, choice.name)
  if (existing) return existing.id
  await repository.insertCustomer(db, scope, { id: choice.id, name: choice.name })
  return choice.id
}

async function projectValues(db: Executor, scope: Scope, fields: ProjectFields) {
  const normalizedName = normalizeName(fields.name)
  if (!normalizedName) throw new AppError('INVALID', 'project_name_invalid')
  return {
    name: fields.name,
    normalizedName,
    customerId: await resolveCustomer(db, scope, fields.customer),
    descriptionEt: fields.description.et,
    descriptionEn: fields.description.en,
    startDate: fields.period.startDate,
    endDate: fields.period.endDate,
    tenderReference: fields.tenderReference,
    totalHours: fields.totalHours?.value ?? null,
    totalHoursQualifier: fields.totalHours?.qualifier ?? null,
    cost: fields.cost?.value ?? null,
    costQualifier: fields.cost?.qualifier ?? null,
  }
}

// The project's contacts must be live contacts of its customer.
async function requireCustomerContacts(
  db: Executor,
  scope: Scope,
  customerId: string | null,
  contactIds: string[],
) {
  if (contactIds.length === 0) return
  const own = customerId ? await repository.listContacts(db, scope, customerId) : []
  const ids = new Set(own.map((contact) => contact.id))
  if (!contactIds.every((id) => ids.has(id))) {
    throw new AppError('INVALID', 'contact_other_customer')
  }
}

async function saveProject(
  db: Executor,
  scope: Scope,
  projectId: string,
  fields: ProjectFields,
  isNew: boolean,
) {
  const values = await projectValues(db, scope, fields)
  const contactIds = [...new Set(fields.contactIds)]
  await requireCustomerContacts(db, scope, values.customerId, contactIds)
  if (isNew) await repository.insertProject(db, scope, { id: projectId, ...values })
  else await repository.updateProject(db, scope, projectId, values)
  await repository.setProjectContacts(db, scope, projectId, contactIds)
}

// A name that normalizes like an existing project's is allowed: the form only warns,
// because two projects can share a name.
export async function createProject(db: Database, scope: Scope, input: CreateProjectInput) {
  requirePermission(scope, { project: ['create'] }, 'project_forbidden')
  await db.transaction((tx) => saveProject(tx, scope, input.id, input, true))
  return { id: input.id }
}

export async function updateProject(db: Database, scope: Scope, input: UpdateProjectInput) {
  requirePermission(scope, { project: ['update'] }, 'project_forbidden')
  await db.transaction(async (tx) => {
    if (!(await repository.findProject(tx, scope, input.projectId))) {
      throw new AppError('NOT_FOUND', 'project_not_found')
    }
    await saveProject(tx, scope, input.projectId, input, false)
  })
}

// Soft-deletes the project. Its participations stay stored but stop showing, because
// every read joins them through a live project.
export async function deleteProject(db: Database, scope: Scope, input: ProjectInput) {
  requirePermission(scope, { project: ['delete'] }, 'project_forbidden')
  await db.transaction(async (tx) => {
    if (!(await repository.findProject(tx, scope, input.projectId))) {
      throw new AppError('NOT_FOUND', 'project_not_found')
    }
    await repository.removeProject(tx, scope, input.projectId)
  })
}

// Contact persons are the customer's, edited from the project form. They are third-party
// personal data, so only admins read or change them here (docs/product.md, "Personal data
// and GDPR").
function requireContacts(scope: Scope) {
  requirePermission(scope, { customer: ['update'] }, 'contact_forbidden')
}

export async function contacts(db: Database, scope: Scope, input: ContactsInput) {
  requireContacts(scope)
  return repository.listContacts(db, scope, input.customerId)
}

function contactValues(input: AddContactInput | UpdateContactInput) {
  return {
    name: input.name,
    email: input.email,
    phone: input.phone,
    noLongerValid: input.noLongerValid,
    note: input.note,
  }
}

export async function addContact(db: Database, scope: Scope, input: AddContactInput) {
  requireContacts(scope)
  await db.transaction(async (tx) => {
    if (!(await repository.findCustomer(tx, scope, input.customerId))) {
      throw new AppError('INVALID', 'customer_not_found')
    }
    await repository.insertContact(tx, scope, {
      id: input.id,
      customerId: input.customerId,
      ...contactValues(input),
    })
  })
  return { id: input.id }
}

async function requireContact(db: Executor, scope: Scope, contactId: string) {
  if (!(await repository.findContact(db, scope, contactId))) {
    throw new AppError('NOT_FOUND', 'contact_not_found')
  }
}

export async function updateContact(db: Database, scope: Scope, input: UpdateContactInput) {
  requireContacts(scope)
  await db.transaction(async (tx) => {
    await requireContact(tx, scope, input.contactId)
    await repository.updateContact(tx, scope, input.contactId, contactValues(input))
  })
}

// Soft-deletes the contact. Its project links stay stored but stop showing, because every
// read joins them through a live contact.
export async function deleteContact(db: Database, scope: Scope, input: DeleteContactInput) {
  requireContacts(scope)
  await db.transaction(async (tx) => {
    await requireContact(tx, scope, input.contactId)
    await repository.removeContact(tx, scope, input.contactId)
  })
}
