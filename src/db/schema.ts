// Drizzle's view of the tables, kept by hand to match the SQL migrations in drizzle/.
// db:drift reports any difference (docs/migrations.md).
import { sql } from 'drizzle-orm'
import {
  type AnySQLiteColumn,
  check,
  foreignKey,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'
import { currentActor } from './actor'

const nowMs = sql`(CAST(ROUND(unixepoch('subsec') * 1000) AS INTEGER))`

function timestamp(name: string) {
  return integer(name, { mode: 'timestamp_ms' })
}

// Audit columns, in the order docs/migrations.md gives them. The app sets updated_at on
// every update; the table's trigger only covers statements that bypass Drizzle.
function createdAudit() {
  return {
    createdAt: timestamp('created_at').default(nowMs).notNull(),
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id)
      .$defaultFn(currentActor),
  }
}

function updatedAudit() {
  return {
    updatedAt: timestamp('updated_at')
      .default(nowMs)
      .notNull()
      .$onUpdateFn(() => new Date()),
    updatedBy: text('updated_by')
      .notNull()
      .references(() => user.id)
      .$defaultFn(currentActor)
      .$onUpdateFn(currentActor),
  }
}

function sysDeleted() {
  return {
    sysDeleted: integer('sys_deleted', { mode: 'boolean' })
      .default(sql`0`)
      .notNull(),
  }
}

// A period date: YYYY-MM-DD, YYYY-MM, or YYYY (docs/architecture.md, "Types"). The SQL text
// matches the migrations', which db:drift compares.
function periodDateCheck(table: string, column: string, nullable: boolean) {
  const forms = [
    `${column} GLOB '[0-9][0-9][0-9][0-9]'`,
    `${column} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]'`,
    `${column} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'`,
  ]
  const condition = [...(nullable ? [`${column} IS NULL`] : []), ...forms].join(' OR ')
  return check(`${table}_${column}`, sql.raw(condition))
}

function periodChecks(table: string, startNullable: boolean) {
  return [
    periodDateCheck(table, 'start_date', startNullable),
    periodDateCheck(table, 'end_date', true),
    check(
      `${table}_period`,
      sql`end_date IS NULL OR end_date >= substr(start_date, 1, length(end_date))`,
    ),
  ]
}

// A calendar date: YYYY-MM-DD. NULL passes, as in every CHECK.
function calendarDateCheck(table: string, column: string) {
  return check(
    `${table}_${column}`,
    sql.raw(`${column} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'`),
  )
}

export const QUALIFIERS = ['exact', 'approximately', 'more_than'] as const

// The UI languages, as messages/ and project.inlang/settings.json list them.
export const LOCALES = ['et', 'en'] as const

// An approximate number: the value and its qualifier, null together.
function approximateChecks(table: string, column: string) {
  return [
    check(
      `${table}_${column}_qualifier`,
      sql.raw(`${column}_qualifier IN ('exact', 'approximately', 'more_than')`),
    ),
    check(
      `${table}_${column}_pair`,
      sql.raw(`(${column} IS NULL) = (${column}_qualifier IS NULL)`),
    ),
  ]
}

function organizationId() {
  return text('organization_id')
    .notNull()
    .references(() => organization.id)
}

// Auth (Better Auth core) -------------------------------------------------------------------

export const user = sqliteTable(
  'user',
  {
    id: text().primaryKey(),
    name: text().notNull(),
    email: text().notNull(),
    emailVerified: integer('email_verified', { mode: 'boolean' })
      .default(sql`0`)
      .notNull(),
    image: text(),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
    // The UI language the user chose; null until they choose.
    locale: text({ enum: LOCALES }),
  },
  (t) => [
    uniqueIndex('user_email_unique').on(t.email),
    check('user_email_verified', sql`email_verified IN (0, 1)`),
    check('user_locale', sql`locale IN ('et', 'en')`),
  ],
)

export const organization = sqliteTable(
  'organization',
  {
    id: text().primaryKey(),
    name: text().notNull(),
    slug: text().notNull(),
    logo: text(),
    metadata: text(),
    createdAt: timestamp('created_at').notNull(),
  },
  (t) => [uniqueIndex('organization_slug_unique').on(t.slug)],
)

export const session = sqliteTable(
  'session',
  {
    id: text().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    token: text().notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    activeOrganizationId: text('active_organization_id').references(() => organization.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (t) => [
    uniqueIndex('session_token_unique').on(t.token),
    index('session_user_id_idx').on(t.userId),
  ],
)

export const account = sqliteTable(
  'account',
  {
    id: text().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text(),
    password: text(),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (t) => [
    index('account_user_id_idx').on(t.userId),
    index('account_provider_id_account_id_idx').on(t.providerId, t.accountId),
  ],
)

export const verification = sqliteTable(
  'verification',
  {
    id: text().primaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (t) => [index('verification_identifier_idx').on(t.identifier)],
)

// Tenancy (Better Auth organization plugin) -------------------------------------------------

export const member = sqliteTable(
  'member',
  {
    id: text().primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: text().default('employee').notNull(),
    createdAt: timestamp('created_at').notNull(),
  },
  (t) => [
    uniqueIndex('member_organization_id_user_id_unique').on(t.organizationId, t.userId),
    index('member_user_id_idx').on(t.userId),
  ],
)

export const invitation = sqliteTable(
  'invitation',
  {
    id: text().primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    email: text().notNull(),
    role: text(),
    status: text().default('pending').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    inviterId: text('inviter_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull(),
  },
  (t) => [index('invitation_organization_id_email_idx').on(t.organizationId, t.email)],
)

// Catalogue ---------------------------------------------------------------------------------

export const technologyCategory = sqliteTable(
  'technology_category',
  {
    id: text().primaryKey(),
    organizationId: organizationId(),
    nameEt: text('name_et'),
    nameEn: text('name_en'),
    position: integer().default(0).notNull(),
    ...createdAudit(),
    ...updatedAudit(),
    ...sysDeleted(),
  },
  (t) => [
    index('technology_category_organization_id_idx').on(t.organizationId),
    uniqueIndex('technology_category_id_organization_id_unique').on(t.id, t.organizationId),
    check('technology_category_name', sql`name_et IS NOT NULL OR name_en IS NOT NULL`),
    check('technology_category_sys_deleted', sql`sys_deleted IN (0, 1)`),
  ],
)

export const technology = sqliteTable(
  'technology',
  {
    id: text().primaryKey(),
    organizationId: organizationId(),
    categoryId: text('category_id').notNull(),
    name: text().notNull(),
    normalizedName: text('normalized_name').notNull(),
    mergedIntoId: text('merged_into_id'),
    ...createdAudit(),
    ...updatedAudit(),
    ...sysDeleted(),
  },
  (t) => [
    foreignKey({
      name: 'technology_category',
      columns: [t.categoryId, t.organizationId],
      foreignColumns: [technologyCategory.id, technologyCategory.organizationId],
    }),
    foreignKey({
      name: 'technology_merged_into',
      columns: [t.mergedIntoId, t.organizationId],
      foreignColumns: [t.id, t.organizationId],
    }),
    uniqueIndex('technology_organization_id_normalized_name_unique')
      .on(t.organizationId, t.normalizedName)
      .where(sql`sys_deleted = 0`),
    uniqueIndex('technology_id_organization_id_unique').on(t.id, t.organizationId),
    index('technology_category_id_idx').on(t.categoryId),
    check('technology_sys_deleted', sql`sys_deleted IN (0, 1)`),
  ],
)

export const tenderCriterion = sqliteTable(
  'tender_criterion',
  {
    id: text().primaryKey(),
    organizationId: organizationId(),
    nameEt: text('name_et'),
    nameEn: text('name_en'),
    position: integer().default(0).notNull(),
    ...createdAudit(),
    ...updatedAudit(),
    ...sysDeleted(),
  },
  (t) => [
    index('tender_criterion_organization_id_idx').on(t.organizationId),
    uniqueIndex('tender_criterion_id_organization_id_unique').on(t.id, t.organizationId),
    check('tender_criterion_name', sql`name_et IS NOT NULL OR name_en IS NOT NULL`),
    check('tender_criterion_sys_deleted', sql`sys_deleted IN (0, 1)`),
  ],
)

// Projects ----------------------------------------------------------------------------------

export const customer = sqliteTable(
  'customer',
  {
    id: text().primaryKey(),
    organizationId: organizationId(),
    name: text().notNull(),
    ...createdAudit(),
    ...updatedAudit(),
    ...sysDeleted(),
  },
  (t) => [
    uniqueIndex('customer_organization_id_name_unique')
      .on(t.organizationId, t.name)
      .where(sql`sys_deleted = 0`),
    uniqueIndex('customer_id_organization_id_unique').on(t.id, t.organizationId),
    check('customer_sys_deleted', sql`sys_deleted IN (0, 1)`),
  ],
)

export const contactPerson = sqliteTable(
  'contact_person',
  {
    id: text().primaryKey(),
    organizationId: organizationId(),
    customerId: text('customer_id').notNull(),
    name: text().notNull(),
    email: text(),
    phone: text(),
    noLongerValid: integer('no_longer_valid', { mode: 'boolean' })
      .default(sql`0`)
      .notNull(),
    note: text(),
    ...createdAudit(),
    ...updatedAudit(),
    ...sysDeleted(),
  },
  (t) => [
    index('contact_person_organization_id_idx').on(t.organizationId),
    foreignKey({
      name: 'contact_person_customer',
      columns: [t.customerId, t.organizationId],
      foreignColumns: [customer.id, customer.organizationId],
    }),
    index('contact_person_customer_id_idx').on(t.customerId),
    uniqueIndex('contact_person_id_organization_id_unique').on(t.id, t.organizationId),
    check('contact_person_no_longer_valid', sql`no_longer_valid IN (0, 1)`),
    check('contact_person_sys_deleted', sql`sys_deleted IN (0, 1)`),
  ],
)

export const project = sqliteTable(
  'project',
  {
    id: text().primaryKey(),
    organizationId: organizationId(),
    customerId: text('customer_id'),
    name: text().notNull(),
    normalizedName: text('normalized_name').notNull(),
    descriptionEt: text('description_et'),
    descriptionEn: text('description_en'),
    startDate: text('start_date').notNull(),
    endDate: text('end_date'),
    tenderReference: text('tender_reference'),
    totalHours: integer('total_hours'),
    totalHoursQualifier: text('total_hours_qualifier', { enum: QUALIFIERS }),
    cost: integer(),
    costQualifier: text('cost_qualifier', { enum: QUALIFIERS }),
    importRef: text('import_ref'),
    ...createdAudit(),
    ...updatedAudit(),
    ...sysDeleted(),
  },
  (t) => [
    foreignKey({
      name: 'project_customer',
      columns: [t.customerId, t.organizationId],
      foreignColumns: [customer.id, customer.organizationId],
    }),
    uniqueIndex('project_organization_id_import_ref_unique')
      .on(t.organizationId, t.importRef)
      .where(sql`import_ref IS NOT NULL AND sys_deleted = 0`),
    index('project_organization_id_normalized_name_idx').on(t.organizationId, t.normalizedName),
    index('project_customer_id_idx').on(t.customerId),
    uniqueIndex('project_id_organization_id_unique').on(t.id, t.organizationId),
    ...periodChecks('project', false),
    ...approximateChecks('project', 'total_hours'),
    ...approximateChecks('project', 'cost'),
    check('project_sys_deleted', sql`sys_deleted IN (0, 1)`),
  ],
)

export const projectContact = sqliteTable(
  'project_contact',
  {
    projectId: text('project_id').notNull(),
    contactPersonId: text('contact_person_id').notNull(),
    organizationId: organizationId(),
    ...createdAudit(),
  },
  (t) => [
    index('project_contact_organization_id_idx').on(t.organizationId),
    primaryKey({ columns: [t.projectId, t.contactPersonId] }),
    foreignKey({
      name: 'project_contact_project',
      columns: [t.projectId, t.organizationId],
      foreignColumns: [project.id, project.organizationId],
    }),
    foreignKey({
      name: 'project_contact_contact_person',
      columns: [t.contactPersonId, t.organizationId],
      foreignColumns: [contactPerson.id, contactPerson.organizationId],
    }),
    index('project_contact_contact_person_id_idx').on(t.contactPersonId),
  ],
)

export const projectTechnology = sqliteTable(
  'project_technology',
  {
    projectId: text('project_id').notNull(),
    technologyId: text('technology_id').notNull(),
    organizationId: organizationId(),
    ...createdAudit(),
  },
  (t) => [
    index('project_technology_organization_id_idx').on(t.organizationId),
    primaryKey({ columns: [t.projectId, t.technologyId] }),
    foreignKey({
      name: 'project_technology_project',
      columns: [t.projectId, t.organizationId],
      foreignColumns: [project.id, project.organizationId],
    }),
    foreignKey({
      name: 'project_technology_technology',
      columns: [t.technologyId, t.organizationId],
      foreignColumns: [technology.id, technology.organizationId],
    }),
    index('project_technology_technology_id_idx').on(t.technologyId),
  ],
)

export const projectCriterionAnswer = sqliteTable(
  'project_criterion_answer',
  {
    projectId: text('project_id').notNull(),
    criterionId: text('criterion_id').notNull(),
    organizationId: organizationId(),
    answer: integer({ mode: 'boolean' }).notNull(),
    note: text(),
    ...createdAudit(),
    ...updatedAudit(),
  },
  (t) => [
    index('project_criterion_answer_organization_id_idx').on(t.organizationId),
    primaryKey({ columns: [t.projectId, t.criterionId] }),
    foreignKey({
      name: 'project_criterion_answer_project',
      columns: [t.projectId, t.organizationId],
      foreignColumns: [project.id, project.organizationId],
    }),
    foreignKey({
      name: 'project_criterion_answer_criterion',
      columns: [t.criterionId, t.organizationId],
      foreignColumns: [tenderCriterion.id, tenderCriterion.organizationId],
    }),
    index('project_criterion_answer_criterion_id_idx').on(t.criterionId),
    check('project_criterion_answer_answer', sql`answer IN (0, 1)`),
  ],
)

// People ------------------------------------------------------------------------------------

export const employeeProfile = sqliteTable(
  'employee_profile',
  {
    id: text().primaryKey(),
    organizationId: organizationId(),
    // Not a foreign key to member: a leaver's profile outlives the membership.
    userId: text('user_id')
      .notNull()
      .references(() => user.id),
    fullName: text('full_name').notNull(),
    joinDate: text('join_date'),
    leftDate: text('left_date'),
    birthDate: text('birth_date'),
    confirmedAt: timestamp('confirmed_at'),
    ...createdAudit(),
    ...updatedAudit(),
  },
  (t) => [
    uniqueIndex('employee_profile_organization_id_user_id_unique').on(t.organizationId, t.userId),
    index('employee_profile_user_id_idx').on(t.userId),
    uniqueIndex('employee_profile_id_organization_id_unique').on(t.id, t.organizationId),
    calendarDateCheck('employee_profile', 'join_date'),
    calendarDateCheck('employee_profile', 'left_date'),
    calendarDateCheck('employee_profile', 'birth_date'),
    check('employee_profile_employment', sql`left_date >= join_date`),
  ],
)

function profileKey(table: string, profileId: AnySQLiteColumn, organization: AnySQLiteColumn) {
  return foreignKey({
    name: `${table}_profile`,
    columns: [profileId, organization],
    foreignColumns: [employeeProfile.id, employeeProfile.organizationId],
  })
}

export const education = sqliteTable(
  'education',
  {
    id: text().primaryKey(),
    organizationId: organizationId(),
    profileId: text('profile_id').notNull(),
    institutionEt: text('institution_et'),
    institutionEn: text('institution_en'),
    fieldEt: text('field_et'),
    fieldEn: text('field_en'),
    degreeEt: text('degree_et'),
    degreeEn: text('degree_en'),
    startDate: text('start_date'),
    endDate: text('end_date'),
    ...createdAudit(),
    ...updatedAudit(),
    ...sysDeleted(),
  },
  (t) => [
    index('education_organization_id_idx').on(t.organizationId),
    profileKey('education', t.profileId, t.organizationId),
    index('education_profile_id_idx').on(t.profileId),
    check('education_institution', sql`institution_et IS NOT NULL OR institution_en IS NOT NULL`),
    ...periodChecks('education', true),
    check('education_sys_deleted', sql`sys_deleted IN (0, 1)`),
  ],
)

export const participation = sqliteTable(
  'participation',
  {
    id: text().primaryKey(),
    organizationId: organizationId(),
    profileId: text('profile_id').notNull(),
    projectId: text('project_id').notNull(),
    startDate: text('start_date').notNull(),
    endDate: text('end_date'),
    roleEt: text('role_et'),
    roleEn: text('role_en'),
    hours: integer(),
    hoursQualifier: text('hours_qualifier', { enum: QUALIFIERS }),
    tasksEt: text('tasks_et'),
    tasksEn: text('tasks_en'),
    ...createdAudit(),
    ...updatedAudit(),
    ...sysDeleted(),
  },
  (t) => [
    index('participation_organization_id_idx').on(t.organizationId),
    profileKey('participation', t.profileId, t.organizationId),
    foreignKey({
      name: 'participation_project',
      columns: [t.projectId, t.organizationId],
      foreignColumns: [project.id, project.organizationId],
    }),
    index('participation_profile_id_idx').on(t.profileId),
    index('participation_project_id_idx').on(t.projectId),
    uniqueIndex('participation_id_organization_id_unique').on(t.id, t.organizationId),
    ...periodChecks('participation', false),
    ...approximateChecks('participation', 'hours'),
    check('participation_sys_deleted', sql`sys_deleted IN (0, 1)`),
  ],
)

export const participationTechnology = sqliteTable(
  'participation_technology',
  {
    participationId: text('participation_id').notNull(),
    technologyId: text('technology_id').notNull(),
    organizationId: organizationId(),
    ...createdAudit(),
  },
  (t) => [
    index('participation_technology_organization_id_idx').on(t.organizationId),
    primaryKey({ columns: [t.participationId, t.technologyId] }),
    foreignKey({
      name: 'participation_technology_participation',
      columns: [t.participationId, t.organizationId],
      foreignColumns: [participation.id, participation.organizationId],
    }),
    foreignKey({
      name: 'participation_technology_technology',
      columns: [t.technologyId, t.organizationId],
      foreignColumns: [technology.id, technology.organizationId],
    }),
    index('participation_technology_technology_id_idx').on(t.technologyId),
  ],
)

export const ownProject = sqliteTable(
  'own_project',
  {
    id: text().primaryKey(),
    organizationId: organizationId(),
    profileId: text('profile_id').notNull(),
    name: text().notNull(),
    employer: text(),
    customerName: text('customer_name'),
    descriptionEt: text('description_et'),
    descriptionEn: text('description_en'),
    startDate: text('start_date').notNull(),
    endDate: text('end_date'),
    tenderReference: text('tender_reference'),
    totalHours: integer('total_hours'),
    totalHoursQualifier: text('total_hours_qualifier', { enum: QUALIFIERS }),
    cost: integer(),
    costQualifier: text('cost_qualifier', { enum: QUALIFIERS }),
    roleEt: text('role_et'),
    roleEn: text('role_en'),
    hours: integer(),
    hoursQualifier: text('hours_qualifier', { enum: QUALIFIERS }),
    tasksEt: text('tasks_et'),
    tasksEn: text('tasks_en'),
    ...createdAudit(),
    ...updatedAudit(),
    ...sysDeleted(),
  },
  (t) => [
    index('own_project_organization_id_idx').on(t.organizationId),
    profileKey('own_project', t.profileId, t.organizationId),
    index('own_project_profile_id_idx').on(t.profileId),
    uniqueIndex('own_project_id_organization_id_unique').on(t.id, t.organizationId),
    ...periodChecks('own_project', false),
    ...approximateChecks('own_project', 'total_hours'),
    ...approximateChecks('own_project', 'cost'),
    ...approximateChecks('own_project', 'hours'),
    check('own_project_sys_deleted', sql`sys_deleted IN (0, 1)`),
  ],
)

export const ownProjectTechnology = sqliteTable(
  'own_project_technology',
  {
    ownProjectId: text('own_project_id').notNull(),
    technologyId: text('technology_id').notNull(),
    organizationId: organizationId(),
    ...createdAudit(),
  },
  (t) => [
    index('own_project_technology_organization_id_idx').on(t.organizationId),
    primaryKey({ columns: [t.ownProjectId, t.technologyId] }),
    foreignKey({
      name: 'own_project_technology_own_project',
      columns: [t.ownProjectId, t.organizationId],
      foreignColumns: [ownProject.id, ownProject.organizationId],
    }),
    foreignKey({
      name: 'own_project_technology_technology',
      columns: [t.technologyId, t.organizationId],
      foreignColumns: [technology.id, technology.organizationId],
    }),
    index('own_project_technology_technology_id_idx').on(t.technologyId),
  ],
)

export const updateRequest = sqliteTable(
  'update_request',
  {
    id: text().primaryKey(),
    organizationId: organizationId(),
    profileId: text('profile_id').notNull(),
    message: text(),
    closedAt: timestamp('closed_at'),
    closedReason: text('closed_reason', { enum: ['confirmed', 'canceled'] }),
    ...createdAudit(),
    ...updatedAudit(),
  },
  (t) => [
    index('update_request_organization_id_idx').on(t.organizationId),
    profileKey('update_request', t.profileId, t.organizationId),
    uniqueIndex('update_request_profile_id_open_unique')
      .on(t.profileId)
      .where(sql`closed_at IS NULL`),
    check('update_request_closed_reason', sql`closed_reason IN ('confirmed', 'canceled')`),
    check('update_request_closed_pair', sql`(closed_at IS NULL) = (closed_reason IS NULL)`),
  ],
)
