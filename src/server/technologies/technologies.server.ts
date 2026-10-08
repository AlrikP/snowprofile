// Rules for the technology catalogue (docs/product.md, "Technology catalogue"). Anyone in
// the organization adds an entry; renaming, recategorizing, and merging are curation.
import type { Database, Executor } from '#/db'
import { normalizeName } from '#/lib/normalize-name'
import { AppError } from '../errors'
import { requirePermission, type Scope } from '../scope.server'
import * as repository from './technologies.repository.server'
import type {
  AddTechnologyInput,
  MarkNotDuplicateInput,
  MergeTechnologyInput,
  UpdateTechnologyInput,
} from './technologies.schemas'

// The pairs admins marked "Not a duplicate" come along, so the client leaves them out of
// its near-duplicate suggestions (src/lib/technology-duplicates.ts).
export async function catalogue(db: Database, scope: Scope) {
  const [categories, technologies, distinctPairs] = await Promise.all([
    repository.listCategories(db, scope),
    repository.listTechnologies(db, scope),
    repository.listDistinctPairs(db, scope),
  ])
  return { categories, technologies, distinctPairs }
}

// The name's normalized form, refused when it leaves nothing to compare, such as "!!".
function normalized(name: string) {
  const value = normalizeName(name)
  if (!value) throw new AppError('INVALID', 'technology_name_invalid')
  return value
}

async function requireCategory(db: Executor, scope: Scope, categoryId: string) {
  if (!(await repository.findCategory(db, scope, categoryId))) {
    throw new AppError('INVALID', 'technology_category_not_found')
  }
}

export async function addTechnology(db: Database, scope: Scope, input: AddTechnologyInput) {
  requirePermission(scope, { technology: ['create'] }, 'technology_forbidden')
  const normalizedName = normalized(input.name)
  // One transaction, so two people adding the same name at once can't both pass the check.
  await db.transaction(async (tx) => {
    await requireCategory(tx, scope, input.categoryId)
    if (await repository.findTechnologyByName(tx, scope, normalizedName)) {
      throw new AppError('CONFLICT', 'technology_exists')
    }
    await repository.insertTechnology(tx, scope, { ...input, normalizedName })
  })
  return { id: input.id }
}

export async function updateTechnology(db: Database, scope: Scope, input: UpdateTechnologyInput) {
  requirePermission(scope, { technology: ['curate'] }, 'technology_forbidden')
  const normalizedName = normalized(input.name)
  await db.transaction(async (tx) => {
    if (!(await repository.findTechnology(tx, scope, input.technologyId))) {
      throw new AppError('NOT_FOUND', 'technology_not_found')
    }
    await requireCategory(tx, scope, input.categoryId)
    if (await repository.findTechnologyByName(tx, scope, normalizedName, input.technologyId)) {
      throw new AppError('CONFLICT', 'technology_exists')
    }
    await repository.updateTechnology(tx, scope, input.technologyId, {
      name: input.name,
      normalizedName,
      categoryId: input.categoryId,
    })
  })
}

// Merges a duplicate into the entry that stays: every project, participation, and own
// project that listed it lists the survivor instead, and the duplicate leaves the catalogue.
export async function mergeTechnology(db: Database, scope: Scope, input: MergeTechnologyInput) {
  requirePermission(scope, { technology: ['curate'] }, 'technology_forbidden')
  if (input.technologyId === input.intoId) throw new AppError('INVALID', 'technology_merge_self')
  await db.transaction(async (tx) => {
    const [from, into] = await Promise.all([
      repository.findTechnology(tx, scope, input.technologyId),
      repository.findTechnology(tx, scope, input.intoId),
    ])
    if (!from || !into) throw new AppError('NOT_FOUND', 'technology_not_found')
    await repository.moveTechnologyLinks(tx, scope, from.id, into.id)
    await repository.markTechnologyMerged(tx, scope, from.id, into.id)
  })
}

// An admin's word that two entries the near-duplicate rule pairs are different
// technologies, so the pair is never suggested again.
export async function markNotDuplicate(db: Database, scope: Scope, input: MarkNotDuplicateInput) {
  requirePermission(scope, { technology: ['curate'] }, 'technology_forbidden')
  await db.transaction(async (tx) => {
    const [one, other] = await Promise.all([
      repository.findTechnology(tx, scope, input.technologyId),
      repository.findTechnology(tx, scope, input.otherTechnologyId),
    ])
    if (!one || !other) throw new AppError('NOT_FOUND', 'technology_not_found')
    await repository.insertDistinctPair(tx, scope, one.id, other.id)
  })
}
