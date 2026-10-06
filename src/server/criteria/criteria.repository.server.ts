import { and, asc, eq, sql } from 'drizzle-orm'
import type { Executor } from '#/db'
import { tenderCriterion } from '#/db/schema'
import type { Scope } from '../scope.server'

// How many live projects answered the characteristic, yes or no. Plain SQL for the same
// reason as the technology counts: a correlated subquery needs the table name.
const ANSWER_COUNT = sql<number>`(
  SELECT count(*) FROM project_criterion_answer AS a
  JOIN project AS p ON p.id = a.project_id AND p.sys_deleted = 0
  WHERE a.criterion_id = tender_criterion.id
)`

function live(scope: Scope) {
  return and(
    eq(tenderCriterion.organizationId, scope.organizationId),
    eq(tenderCriterion.sysDeleted, sql`0`),
  )
}

// The live checklist in order. Positions can tie, so the ID, which sorts by creation time,
// breaks the tie.
export async function listCriteria(db: Executor, scope: Scope) {
  return db
    .select({
      id: tenderCriterion.id,
      nameEt: tenderCriterion.nameEt,
      nameEn: tenderCriterion.nameEn,
      answers: ANSWER_COUNT,
    })
    .from(tenderCriterion)
    .where(live(scope))
    .orderBy(asc(tenderCriterion.position), asc(tenderCriterion.id))
}

export async function findCriterion(db: Executor, scope: Scope, criterionId: string) {
  const [row] = await db
    .select({ id: tenderCriterion.id })
    .from(tenderCriterion)
    .where(and(live(scope), eq(tenderCriterion.id, criterionId)))
  return row
}

// Adds a characteristic after the last live one.
export async function insertCriterion(
  db: Executor,
  scope: Scope,
  values: { id: string; nameEt: string | null; nameEn: string | null },
) {
  const [last] = await db
    .select({ position: sql<number | null>`max(${tenderCriterion.position})` })
    .from(tenderCriterion)
    .where(live(scope))
  await db.insert(tenderCriterion).values({
    ...values,
    organizationId: scope.organizationId,
    position: (last?.position ?? -1) + 1,
  })
}

export async function updateCriterion(
  db: Executor,
  scope: Scope,
  criterionId: string,
  values: { nameEt: string | null; nameEn: string | null },
) {
  await db
    .update(tenderCriterion)
    .set(values)
    .where(and(live(scope), eq(tenderCriterion.id, criterionId)))
}

// Numbers the characteristics in the given order, from 0.
export async function setCriterionPositions(db: Executor, scope: Scope, criterionIds: string[]) {
  for (const [position, criterionId] of criterionIds.entries()) {
    await db
      .update(tenderCriterion)
      .set({ position })
      .where(and(live(scope), eq(tenderCriterion.id, criterionId)))
  }
}

// Takes a characteristic off the checklist. Its answers stay, so a mistaken removal can be
// undone by hand (docs/architecture.md, "Audit and deletion").
export async function removeCriterion(db: Executor, scope: Scope, criterionId: string) {
  await db
    .update(tenderCriterion)
    .set({ sysDeleted: true })
    .where(and(live(scope), eq(tenderCriterion.id, criterionId)))
}
