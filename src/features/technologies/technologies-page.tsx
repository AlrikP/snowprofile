import { useSuspenseQuery } from '@tanstack/react-query'
import { EllipsisIcon, GitMergeIcon, PencilIcon, PlusIcon, SearchIcon } from 'lucide-react'
import { useState } from 'react'
import { AddTechnologyDialog } from '#/components/add-technology-dialog'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader } from '#/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { Input } from '#/components/ui/input'
import { normalizeName } from '#/lib/normalize-name'
import {
  categoryName,
  type Technology,
  technologyCatalogueQuery,
  technologyNotesQuery,
} from '#/lib/technology-catalogue'
import { nearDuplicatePairs } from '#/lib/technology-duplicates'
import { m } from '#/paraglide/messages.js'
import { EditTechnologyDialog } from './edit-technology-dialog'
import { LinkedText } from './linked-text'
import { MergeTechnologyDialog } from './merge-technology-dialog'
import { PossibleDuplicates } from './possible-duplicates'

function TechnologyActions({
  technology,
  onEdit,
  onMerge,
}: {
  technology: Technology
  onEdit: () => void
  onMerge: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={m.action_actions_for({ name: technology.name })}
        >
          <EllipsisIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onSelect={onEdit}>
          <PencilIcon />
          {m.technologies_edit()}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onMerge}>
          <GitMergeIcon />
          {m.technologies_merge()}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function TechnologiesPage({
  organizationId,
  canCurate,
}: {
  organizationId: string
  canCurate: boolean
}) {
  const { data: catalogue } = useSuspenseQuery(technologyCatalogueQuery(organizationId))
  const { data: notes } = useSuspenseQuery(technologyNotesQuery(organizationId))
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Technology | null>(null)
  const [merging, setMerging] = useState<{ technology: Technology; intoId?: string } | null>(null)
  const pairs = canCurate ? nearDuplicatePairs(catalogue.technologies, catalogue.distinctPairs) : []

  const needle = normalizeName(search)
  const shown = catalogue.technologies.filter((each) => normalizeName(each.name).includes(needle))
  const groups = catalogue.categories
    .map((category) => ({
      category,
      technologies: shown.filter((each) => each.categoryId === category.id),
    }))
    .filter((group) => group.technologies.length > 0)

  return (
    <main className="flex flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl">{m.technologies_title()}</h1>
          {!canCurate && (
            <p className="text-muted-foreground text-sm">{m.technologies_employee_hint()}</p>
          )}
        </div>
        <Button onClick={() => setAdding(true)}>
          <PlusIcon />
          {m.technologies_add()}
        </Button>
      </div>

      {canCurate && (
        <PossibleDuplicates
          organizationId={organizationId}
          pairs={pairs}
          onMerge={({ from, into }) => setMerging({ technology: from, intoId: into.id })}
        />
      )}

      <div className="relative max-w-sm">
        <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          type="search"
          className="pl-9"
          aria-label={m.technologies_search()}
          placeholder={m.technologies_search()}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {groups.length === 0 ? (
        <p className="text-muted-foreground">{m.technologies_no_match()}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {groups.map(({ category, technologies }) => {
            const headingId = `category-${category.id}`
            return (
              <Card
                key={category.id}
                role="region"
                className="gap-3 pb-3"
                aria-labelledby={headingId}
              >
                <CardHeader className="grid-cols-[1fr_auto]">
                  <h2 id={headingId} className="text-xl">
                    {categoryName(category)}
                  </h2>
                  <Badge variant="secondary">{technologies.length}</Badge>
                </CardHeader>
                <CardContent>
                  <ul className="flex flex-col divide-y">
                    {technologies.map((technology) => {
                      const note = notes.get(technology.id)
                      return (
                        <li key={technology.id} className="flex min-h-10 items-center gap-2 py-1">
                          <div className="flex-1">
                            <span className="font-medium">{technology.name}</span>
                            {note && (
                              <LinkedText text={note} className="text-muted-foreground text-sm" />
                            )}
                          </div>
                          <span className="text-muted-foreground text-sm">
                            {m.technologies_use_counts({
                              projects: technology.projects,
                              people: technology.people,
                            })}
                          </span>
                          {canCurate && (
                            <TechnologyActions
                              technology={technology}
                              onEdit={() => setEditing(technology)}
                              onMerge={() => setMerging({ technology })}
                            />
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <AddTechnologyDialog
        open={adding}
        onOpenChange={setAdding}
        organizationId={organizationId}
        catalogue={catalogue}
      />
      {canCurate && (
        <>
          <EditTechnologyDialog
            organizationId={organizationId}
            catalogue={catalogue}
            technology={editing}
            initialNote={editing ? notes.get(editing.id) : undefined}
            onClose={() => setEditing(null)}
          />
          <MergeTechnologyDialog
            organizationId={organizationId}
            catalogue={catalogue}
            technology={merging?.technology ?? null}
            initialIntoId={merging?.intoId}
            onClose={() => setMerging(null)}
          />
        </>
      )}
    </main>
  )
}

export function TechnologiesPending() {
  return (
    <main className="flex flex-col gap-6 p-4 md:p-8" aria-busy="true">
      <h1 className="text-3xl">{m.technologies_title()}</h1>
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <div key={index} className="bg-muted h-48 animate-pulse rounded-xl" />
        ))}
      </div>
    </main>
  )
}
