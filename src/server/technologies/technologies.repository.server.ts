// Database access for the technology catalogue. Every query filters by the scope's
// organization; link rows can't cross organizations because of their composite keys.
import { and, asc, eq, ne, sql } from 'drizzle-orm'
import type { Executor } from '#/db'
import {
  ownProjectTechnology,
  participationTechnology,
  projectTechnology,
  technology,
  technologyCategory,
  technologyDistinctPair,
} from '#/db/schema'
import type { Scope } from '../scope.server'

export async function listCategories(db: Executor, scope: Scope) {
  return db
    .select({
      id: technologyCategory.id,
      nameEt: technologyCategory.nameEt,
      nameEn: technologyCategory.nameEn,
    })
    .from(technologyCategory)
    .where(
      and(
        eq(technologyCategory.organizationId, scope.organizationId),
        eq(technologyCategory.sysDeleted, sql`0`),
      ),
    )
    .orderBy(asc(technologyCategory.position))
}

export async function insertCategories(
  db: Executor,
  scope: Scope,
  rows: { id: string; nameEt: string; nameEn: string; position: number }[],
) {
  await db
    .insert(technologyCategory)
    .values(rows.map((row) => ({ ...row, organizationId: scope.organizationId })))
}

export async function findCategory(db: Executor, scope: Scope, categoryId: string) {
  const [row] = await db
    .select({ id: technologyCategory.id })
    .from(technologyCategory)
    .where(
      and(
        eq(technologyCategory.organizationId, scope.organizationId),
        eq(technologyCategory.id, categoryId),
        eq(technologyCategory.sysDeleted, sql`0`),
      ),
    )
  return row
}

// Live entries with how many live projects list each, and how many people used it in a
// participation or an own project. The subqueries are plain SQL because Drizzle leaves out
// table names in a one-table select, and a correlated subquery needs them.
const PROJECT_COUNT = sql<number>`(
  SELECT count(DISTINCT pt.project_id) FROM project_technology AS pt
  JOIN project AS p ON p.id = pt.project_id AND p.sys_deleted = 0
  WHERE pt.technology_id = technology.id
)`

const PEOPLE_COUNT = sql<number>`(
  SELECT count(DISTINCT used.profile_id) FROM (
    SELECT pa.profile_id FROM participation_technology AS pt
    JOIN participation AS pa ON pa.id = pt.participation_id AND pa.sys_deleted = 0
    JOIN project AS p ON p.id = pa.project_id AND p.sys_deleted = 0
    WHERE pt.technology_id = technology.id
    UNION
    SELECT op.profile_id FROM own_project_technology AS ot
    JOIN own_project AS op ON op.id = ot.own_project_id AND op.sys_deleted = 0
    WHERE ot.technology_id = technology.id
  ) AS used
)`

export async function listTechnologies(db: Executor, scope: Scope) {
  return db
    .select({
      id: technology.id,
      name: technology.name,
      categoryId: technology.categoryId,
      note: technology.note,
      projects: PROJECT_COUNT,
      people: PEOPLE_COUNT,
    })
    .from(technology)
    .where(
      and(eq(technology.organizationId, scope.organizationId), eq(technology.sysDeleted, sql`0`)),
    )
    .orderBy(asc(technology.normalizedName))
}

export async function findTechnology(db: Executor, scope: Scope, technologyId: string) {
  const [row] = await db
    .select({ id: technology.id, name: technology.name, note: technology.note })
    .from(technology)
    .where(
      and(
        eq(technology.organizationId, scope.organizationId),
        eq(technology.id, technologyId),
        eq(technology.sysDeleted, sql`0`),
      ),
    )
  return row
}

// The live entry with this normalized name, other than the one being renamed.
export async function findTechnologyByName(
  db: Executor,
  scope: Scope,
  normalizedName: string,
  exceptId?: string,
) {
  const [row] = await db
    .select({ id: technology.id, name: technology.name })
    .from(technology)
    .where(
      and(
        eq(technology.organizationId, scope.organizationId),
        eq(technology.normalizedName, normalizedName),
        eq(technology.sysDeleted, sql`0`),
        exceptId ? ne(technology.id, exceptId) : undefined,
      ),
    )
  return row
}

export async function insertTechnology(
  db: Executor,
  scope: Scope,
  values: { id: string; name: string; normalizedName: string; categoryId: string },
) {
  await db.insert(technology).values({ ...values, organizationId: scope.organizationId })
}

export async function updateTechnology(
  db: Executor,
  scope: Scope,
  technologyId: string,
  values: { name: string; normalizedName: string; categoryId: string; note: string | null },
) {
  await db
    .update(technology)
    .set(values)
    .where(
      and(eq(technology.organizationId, scope.organizationId), eq(technology.id, technologyId)),
    )
}

export async function setTechnologyNote(
  db: Executor,
  scope: Scope,
  technologyId: string,
  note: string | null,
) {
  await db
    .update(technology)
    .set({ note })
    .where(
      and(eq(technology.organizationId, scope.organizationId), eq(technology.id, technologyId)),
    )
}

// Moves every link from one entry to another. A row that already links the survivor keeps
// that link, and the duplicate goes.
export async function moveTechnologyLinks(
  db: Executor,
  scope: Scope,
  fromId: string,
  toId: string,
) {
  const organizationId = scope.organizationId
  const links = [
    { table: projectTechnology, owner: projectTechnology.projectId },
    { table: participationTechnology, owner: participationTechnology.participationId },
    { table: ownProjectTechnology, owner: ownProjectTechnology.ownProjectId },
  ]
  for (const { table, owner } of links) {
    const scoped = and(eq(table.organizationId, organizationId), eq(table.technologyId, fromId))
    await db.run(sql`
      INSERT INTO ${table} (${sql.identifier(owner.name)}, technology_id, organization_id, created_by)
      SELECT ${owner}, ${toId}, ${organizationId}, ${scope.userId} FROM ${table}
      WHERE ${scoped}
      ON CONFLICT DO NOTHING
    `)
    await db.delete(table).where(scoped)
  }
}

// Marks an entry as merged into another and takes it out of the catalogue. Entries merged
// into it earlier now point at the survivor, so the import's lookup takes one step.
export async function markTechnologyMerged(
  db: Executor,
  scope: Scope,
  technologyId: string,
  intoId: string,
) {
  await db
    .update(technology)
    .set({ mergedIntoId: intoId })
    .where(
      and(
        eq(technology.organizationId, scope.organizationId),
        eq(technology.mergedIntoId, technologyId),
      ),
    )
  await db
    .update(technology)
    .set({ mergedIntoId: intoId, sysDeleted: true })
    .where(
      and(eq(technology.organizationId, scope.organizationId), eq(technology.id, technologyId)),
    )
}

// The pairs admins marked "Not a duplicate", lower ID first.
export async function listDistinctPairs(db: Executor, scope: Scope) {
  return db
    .select({
      technologyId: technologyDistinctPair.technologyId,
      otherTechnologyId: technologyDistinctPair.otherTechnologyId,
    })
    .from(technologyDistinctPair)
    .where(eq(technologyDistinctPair.organizationId, scope.organizationId))
}

// Stores the pair once, lower ID first; marking it again changes nothing.
export async function insertDistinctPair(db: Executor, scope: Scope, a: string, b: string) {
  const [technologyId, otherTechnologyId] = a < b ? [a, b] : [b, a]
  await db
    .insert(technologyDistinctPair)
    .values({ technologyId, otherTechnologyId, organizationId: scope.organizationId })
    .onConflictDoNothing()
}
