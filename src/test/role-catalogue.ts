// A small role catalogue for component tests of the roles page and the role picker.
import type { RoleCatalogue } from '#/lib/role-catalogue'

export const testRoles: RoleCatalogue = [
  { id: 'analyst', nameEt: 'Analüütik', nameEn: 'Analyst', uses: 18 },
  { id: 'developer', nameEt: 'Arendaja', nameEn: 'Developer', uses: 64 },
  { id: 'system-analyst', nameEt: 'Süsteemianalüütik', nameEn: null, uses: 2 },
  { id: 'software-developer', nameEt: 'Tarkvaraarendaja', nameEn: 'Software developer', uses: 1 },
]
