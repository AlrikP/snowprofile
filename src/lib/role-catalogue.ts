// The organization's role catalogue on the client: one query that the roles page and every
// role picker share, so an entry added in one shows in all.
import { queryOptions } from '@tanstack/react-query'
import { getLocale } from '#/paraglide/runtime.js'
import { getRoleCatalogue, type RoleCatalogue } from '#/server/roles/roles.functions'
import { type Bilingual, bilingualDisplay } from './bilingual'
import { normalizeName } from './normalize-name'

export type { RoleCatalogue }

export type Role = RoleCatalogue[number]

export function roleCatalogueQuery(organizationId: string) {
  return queryOptions({
    queryKey: ['roles', organizationId],
    queryFn: () => getRoleCatalogue({ data: { organizationId } }),
  })
}

export function roleName(role: Role): Bilingual {
  return { et: role.nameEt, en: role.nameEn }
}

// The name in the UI language, or the other one, for labels and options.
export function roleLabel(role: Role): string {
  return bilingualDisplay(roleName(role), getLocale())?.text ?? ''
}

// Whether either name contains the normalized search text.
export function roleMatches(role: Role, needle: string): boolean {
  return [role.nameEt, role.nameEn].some((name) => name && normalizeName(name).includes(needle))
}

// The live entry a new Estonian name would duplicate, as the server compares names: by the
// Estonian name, or the English one for an entry that has no Estonian name.
export function findDuplicateRole(
  roles: RoleCatalogue,
  nameEt: string,
  exceptId?: string,
): Role | undefined {
  const normalized = normalizeName(nameEt)
  if (!normalized) return undefined
  return roles.find(
    (each) =>
      each.id !== exceptId && normalizeName(each.nameEt ?? each.nameEn ?? '') === normalized,
  )
}
