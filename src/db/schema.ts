// Drizzle's view of the tables, kept by hand to match the SQL migrations in drizzle/.
// db:drift reports any difference (docs/migrations.md).
import { sql } from 'drizzle-orm'
import {
  check,
  foreignKey,
  index,
  integer,
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
  },
  (t) => [
    uniqueIndex('user_email_unique').on(t.email),
    check('user_email_verified', sql`email_verified IN (0, 1)`),
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
    uniqueIndex('tender_criterion_id_organization_id_unique').on(t.id, t.organizationId),
    check('tender_criterion_name', sql`name_et IS NOT NULL OR name_en IS NOT NULL`),
    check('tender_criterion_sys_deleted', sql`sys_deleted IN (0, 1)`),
  ],
)
