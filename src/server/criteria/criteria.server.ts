// Rules for the technical characteristics checklist (docs/product.md, "Technical
// characteristics"). Only admins see or change it; projects answer it in their own form.
import type { Database } from '#/db'
import { AppError } from '../errors'
import { requirePermission, type Scope } from '../scope.server'
import * as repository from './criteria.repository.server'
import type {
  AddCriterionInput,
  MoveCriterionInput,
  RemoveCriterionInput,
  UpdateCriterionInput,
} from './criteria.schemas'

function requireManage(scope: Scope) {
  requirePermission(scope, { tenderCriterion: ['manage'] }, 'criterion_forbidden')
}

export async function checklist(db: Database, scope: Scope) {
  requireManage(scope)
  return repository.listCriteria(db, scope)
}

export async function addCriterion(db: Database, scope: Scope, input: AddCriterionInput) {
  requireManage(scope)
  await db.transaction((tx) =>
    repository.insertCriterion(tx, scope, {
      id: input.id,
      nameEt: input.name.et,
      nameEn: input.name.en,
    }),
  )
  return { id: input.id }
}

export async function updateCriterion(db: Database, scope: Scope, input: UpdateCriterionInput) {
  requireManage(scope)
  await db.transaction(async (tx) => {
    if (!(await repository.findCriterion(tx, scope, input.criterionId))) {
      throw new AppError('NOT_FOUND', 'criterion_not_found')
    }
    await repository.updateCriterion(tx, scope, input.criterionId, {
      nameEt: input.name.et,
      nameEn: input.name.en,
    })
  })
}

// Swaps a characteristic with its neighbour, and numbers the whole list again so earlier
// ties don't keep the two in place. Moving the first one up or the last one down changes
// nothing.
export async function moveCriterion(db: Database, scope: Scope, input: MoveCriterionInput) {
  requireManage(scope)
  await db.transaction(async (tx) => {
    const ids = (await repository.listCriteria(tx, scope)).map((row) => row.id)
    const from = ids.indexOf(input.criterionId)
    if (from === -1) throw new AppError('NOT_FOUND', 'criterion_not_found')
    const to = input.direction === 'up' ? from - 1 : from + 1
    if (to < 0 || to >= ids.length) return
    ;[ids[from], ids[to]] = [ids[to] ?? '', ids[from] ?? '']
    await repository.setCriterionPositions(tx, scope, ids)
  })
}

export async function removeCriterion(db: Database, scope: Scope, input: RemoveCriterionInput) {
  requireManage(scope)
  await db.transaction(async (tx) => {
    if (!(await repository.findCriterion(tx, scope, input.criterionId))) {
      throw new AppError('NOT_FOUND', 'criterion_not_found')
    }
    await repository.removeCriterion(tx, scope, input.criterionId)
  })
}
