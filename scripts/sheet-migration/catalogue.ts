// The technology and role catalogues as the migration fills them: a name finds the live
// entry with the same normalized name, a merged entry's name leads to the entry it was
// merged into, and a new name joins the catalogue. Shared by the projects and people
// loaders, so a name the projects added is found again for the people.
import { and, eq } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'
import type { Executor } from '#/db'
import { projectRole, technology, technologyCategory } from '#/db/schema'
import { normalizeName } from '#/lib/normalize-name'
import type { SheetTechnology } from './parse'

type Entry = {
  id: string
  normalizedName: string
  mergedIntoId: string | null
  sysDeleted: boolean
}

// Live entries by normalized name, with merged names pointing at their live survivor.
function index(rows: Entry[]) {
  const byId = new Map(rows.map((row) => [row.id, row]))
  function survivor(id: string): string | null {
    const seen = new Set<string>()
    for (let row = byId.get(id); row && !seen.has(row.id); row = byId.get(row.mergedIntoId ?? '')) {
      if (!row.sysDeleted) return row.id
      seen.add(row.id)
    }
    return null
  }
  const found = new Map<string, string>()
  // Live names first, so a merged entry never shadows a live one with the same name.
  for (const row of [...rows].sort((a, b) => Number(a.sysDeleted) - Number(b.sysDeleted))) {
    if (found.has(row.normalizedName)) continue
    const id = survivor(row.id)
    if (id) found.set(row.normalizedName, id)
  }
  return found
}

// The category a new technology goes in: the one the sheet's prefix names ("Frontend:"),
// in either language, or "Other".
async function categoryPicker(tx: Executor, organizationId: string) {
  const categories = await tx
    .select({
      id: technologyCategory.id,
      nameEt: technologyCategory.nameEt,
      nameEn: technologyCategory.nameEn,
    })
    .from(technologyCategory)
    .where(
      and(
        eq(technologyCategory.organizationId, organizationId),
        eq(technologyCategory.sysDeleted, false),
      ),
    )
    .orderBy(technologyCategory.position)
  function named(name: string) {
    const wanted = normalizeName(name)
    return categories.find((each) =>
      [each.nameEt, each.nameEn].some((option) => option && normalizeName(option) === wanted),
    )
  }
  const fallback = named('Other') ?? named('Muu') ?? categories.at(-1)
  if (!fallback) throw new Error('The organization has no technology categories.')
  return (category: string | null) => (category ? named(category) : undefined) ?? fallback
}

export async function catalogues(tx: Executor, organizationId: string) {
  const technologies = index(
    await tx
      .select({
        id: technology.id,
        normalizedName: technology.normalizedName,
        mergedIntoId: technology.mergedIntoId,
        sysDeleted: technology.sysDeleted,
      })
      .from(technology)
      .where(eq(technology.organizationId, organizationId)),
  )
  const roles = index(
    await tx
      .select({
        id: projectRole.id,
        normalizedName: projectRole.normalizedName,
        mergedIntoId: projectRole.mergedIntoId,
        sysDeleted: projectRole.sysDeleted,
      })
      .from(projectRole)
      .where(eq(projectRole.organizationId, organizationId)),
  )
  const categoryFor = await categoryPicker(tx, organizationId)
  const added = { technologies: 0, roles: 0 }

  return {
    added,

    async technology({ name, category }: SheetTechnology) {
      const normalizedName = normalizeName(name)
      const found = technologies.get(normalizedName)
      if (found) return found
      const id = uuidv7()
      await tx.insert(technology).values({
        id,
        organizationId,
        categoryId: categoryFor(category).id,
        name,
        normalizedName,
      })
      technologies.set(normalizedName, id)
      added.technologies++
      return id
    },

    // The sheet names roles in Estonian; the English name is left for an admin to add,
    // and the roles page flags it as missing.
    async role(nameEt: string) {
      const normalizedName = normalizeName(nameEt)
      const found = roles.get(normalizedName)
      if (found) return found
      const id = uuidv7()
      await tx.insert(projectRole).values({ id, organizationId, nameEt, normalizedName })
      roles.set(normalizedName, id)
      added.roles++
      return id
    },
  }
}

export type Catalogues = Awaited<ReturnType<typeof catalogues>>
