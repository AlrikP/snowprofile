// Rules for the signed-in user's own account.
import type { Database } from '#/db'
import * as repository from './account.repository.server'
import type { SaveLocaleInput } from './account.schemas'

export function savedLocale(db: Database, userId: string) {
  return repository.findLocale(db, userId)
}

export async function saveLocale(db: Database, userId: string, input: SaveLocaleInput) {
  await repository.updateLocale(db, userId, input.locale)
  return { locale: input.locale }
}
