// Rules for the role catalogue (docs/product.md, "Role catalogue"). Anyone in the
// organization adds an entry, with both names; renaming and merging are curation.
import type { Database, Executor } from '#/db'
import { normalizeName } from '#/lib/normalize-name'
import { AppError } from '../errors'
import { requirePermission, type Scope } from '../scope.server'
import * as repository from './roles.repository.server'
import type { AddRoleInput, MergeRoleInput, UpdateRoleInput } from './roles.schemas'

export async function catalogue(db: Database, scope: Scope) {
  return repository.listRoles(db, scope)
}

// The Estonian name's normalized form, the key that duplicates are found by. Refused when
// it leaves nothing to compare, such as "!!".
function normalized(nameEt: string) {
  const value = normalizeName(nameEt)
  if (!value) throw new AppError('INVALID', 'role_name_invalid')
  return value
}

async function requireUniqueName(
  db: Executor,
  scope: Scope,
  normalizedName: string,
  exceptId?: string,
) {
  if (await repository.findRoleByName(db, scope, normalizedName, exceptId)) {
    throw new AppError('CONFLICT', 'role_exists')
  }
}

export async function addRole(db: Database, scope: Scope, input: AddRoleInput) {
  requirePermission(scope, { projectRole: ['create'] }, 'role_forbidden')
  const normalizedName = normalized(input.name.et)
  // One transaction, so two people adding the same name at once can't both pass the check.
  await db.transaction(async (tx) => {
    await requireUniqueName(tx, scope, normalizedName)
    await repository.insertRole(tx, scope, {
      id: input.id,
      nameEt: input.name.et,
      nameEn: input.name.en,
      normalizedName,
    })
  })
  return { id: input.id }
}

export async function updateRole(db: Database, scope: Scope, input: UpdateRoleInput) {
  requirePermission(scope, { projectRole: ['curate'] }, 'role_forbidden')
  const normalizedName = normalized(input.name.et)
  await db.transaction(async (tx) => {
    if (!(await repository.findRole(tx, scope, input.roleId))) {
      throw new AppError('NOT_FOUND', 'role_not_found')
    }
    await requireUniqueName(tx, scope, normalizedName, input.roleId)
    await repository.updateRole(tx, scope, input.roleId, {
      nameEt: input.name.et,
      nameEn: input.name.en,
      normalizedName,
    })
  })
}

// Merges a duplicate into the entry that stays: every participation and own project that
// listed it lists the survivor instead, and the duplicate leaves the catalogue.
export async function mergeRole(db: Database, scope: Scope, input: MergeRoleInput) {
  requirePermission(scope, { projectRole: ['curate'] }, 'role_forbidden')
  if (input.roleId === input.intoId) throw new AppError('INVALID', 'role_merge_self')
  await db.transaction(async (tx) => {
    const [from, into] = await Promise.all([
      repository.findRole(tx, scope, input.roleId),
      repository.findRole(tx, scope, input.intoId),
    ])
    if (!from || !into) throw new AppError('NOT_FOUND', 'role_not_found')
    await repository.moveRoleLinks(tx, scope, from.id, into.id)
    await repository.markRoleMerged(tx, scope, from.id, into.id)
  })
}
