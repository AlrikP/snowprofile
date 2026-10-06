import { and, asc, eq, ne, sql } from 'drizzle-orm'
import type { Executor } from '#/db'
import { ownProjectRole, participationRole, projectRole } from '#/db/schema'
import type { Scope } from '../scope.server'

// How many live participations and own projects list the role. Plain SQL for the same
// reason as the technology counts: a correlated subquery needs the table name.
const USE_COUNT = sql<number>`(
  SELECT count(*) FROM participation_role AS pr
  JOIN participation AS pa ON pa.id = pr.participation_id AND pa.sys_deleted = 0
  WHERE pr.role_id = project_role.id
) + (
  SELECT count(*) FROM own_project_role AS opr
  JOIN own_project AS op ON op.id = opr.own_project_id AND op.sys_deleted = 0
  WHERE opr.role_id = project_role.id
)`

function live(scope: Scope) {
  return and(
    eq(projectRole.organizationId, scope.organizationId),
    eq(projectRole.sysDeleted, sql`0`),
  )
}

export async function listRoles(db: Executor, scope: Scope) {
  return db
    .select({
      id: projectRole.id,
      nameEt: projectRole.nameEt,
      nameEn: projectRole.nameEn,
      uses: USE_COUNT,
    })
    .from(projectRole)
    .where(live(scope))
    .orderBy(asc(projectRole.normalizedName))
}

export async function findRole(db: Executor, scope: Scope, roleId: string) {
  const [row] = await db
    .select({ id: projectRole.id })
    .from(projectRole)
    .where(and(live(scope), eq(projectRole.id, roleId)))
  return row
}

// The live entry with this normalized name, other than the one being renamed.
export async function findRoleByName(
  db: Executor,
  scope: Scope,
  normalizedName: string,
  exceptId?: string,
) {
  const [row] = await db
    .select({ id: projectRole.id })
    .from(projectRole)
    .where(
      and(
        live(scope),
        eq(projectRole.normalizedName, normalizedName),
        exceptId ? ne(projectRole.id, exceptId) : undefined,
      ),
    )
  return row
}

export async function insertRole(
  db: Executor,
  scope: Scope,
  values: { id: string; nameEt: string; nameEn: string; normalizedName: string },
) {
  await db.insert(projectRole).values({ ...values, organizationId: scope.organizationId })
}

export async function updateRole(
  db: Executor,
  scope: Scope,
  roleId: string,
  values: { nameEt: string; nameEn: string; normalizedName: string },
) {
  await db
    .update(projectRole)
    .set(values)
    .where(and(eq(projectRole.organizationId, scope.organizationId), eq(projectRole.id, roleId)))
}

// Moves every link from one entry to another. A row that already links the survivor keeps
// that link, and the duplicate goes.
export async function moveRoleLinks(db: Executor, scope: Scope, fromId: string, toId: string) {
  const organizationId = scope.organizationId
  const links = [
    { table: participationRole, owner: participationRole.participationId },
    { table: ownProjectRole, owner: ownProjectRole.ownProjectId },
  ]
  for (const { table, owner } of links) {
    const scoped = and(eq(table.organizationId, organizationId), eq(table.roleId, fromId))
    await db.run(sql`
      INSERT INTO ${table} (${sql.identifier(owner.name)}, role_id, organization_id, created_by)
      SELECT ${owner}, ${toId}, ${organizationId}, ${scope.userId} FROM ${table}
      WHERE ${scoped}
      ON CONFLICT DO NOTHING
    `)
    await db.delete(table).where(scoped)
  }
}

// Marks an entry as merged into another and takes it off the list. Entries merged into it
// earlier now point at the survivor, so the import's lookup takes one step.
export async function markRoleMerged(db: Executor, scope: Scope, roleId: string, intoId: string) {
  await db
    .update(projectRole)
    .set({ mergedIntoId: intoId })
    .where(
      and(
        eq(projectRole.organizationId, scope.organizationId),
        eq(projectRole.mergedIntoId, roleId),
      ),
    )
  await db
    .update(projectRole)
    .set({ mergedIntoId: intoId, sysDeleted: true })
    .where(and(eq(projectRole.organizationId, scope.organizationId), eq(projectRole.id, roleId)))
}
