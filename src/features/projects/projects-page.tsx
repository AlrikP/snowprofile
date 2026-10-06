import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { PlusIcon, SearchIcon } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { NativeSelect, NativeSelectOption } from '#/components/ui/native-select'
import { normalizeName } from '#/lib/normalize-name'
import { formatPeriod } from '#/lib/period'
import { m } from '#/paraglide/messages.js'
import type { ProjectListItem } from '#/server/projects/projects.functions'
import { projectsQuery } from './projects-query'

const SHOWN_TECHNOLOGIES = 3

function Technologies({ project }: { project: ProjectListItem }) {
  const hidden = project.technologies.length - SHOWN_TECHNOLOGIES
  return (
    <div className="flex flex-wrap gap-1">
      {project.technologies.slice(0, SHOWN_TECHNOLOGIES).map((technology) => (
        <Badge key={technology.id} variant="secondary">
          {technology.name}
        </Badge>
      ))}
      {hidden > 0 && <Badge variant="outline">{m.projects_more({ count: hidden })}</Badge>}
    </div>
  )
}

function ProjectRow({ organization, project }: { organization: string; project: ProjectListItem }) {
  const customer = project.customerName ?? m.projects_no_customer()
  const period = formatPeriod(project.startDate, project.endDate)
  return (
    <tr className="border-b last:border-0">
      <td className="px-4 py-3 align-top">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/$organization/projects/$projectId"
            params={{ organization, projectId: project.id }}
            className="font-medium hover:underline"
          >
            {project.name}
          </Link>
          {project.mine && <Badge>{m.projects_you_took_part()}</Badge>}
        </div>
        <div className="text-muted-foreground text-sm md:hidden">{customer}</div>
        <div className="text-muted-foreground text-sm md:hidden">{period}</div>
      </td>
      <td className="hidden px-4 py-3 align-top md:table-cell">{customer}</td>
      <td className="hidden px-4 py-3 align-top whitespace-nowrap md:table-cell">{period}</td>
      <td className="hidden px-4 py-3 align-top lg:table-cell">
        <Technologies project={project} />
      </td>
      <td className="px-4 py-3 text-right align-top tabular-nums">{project.people}</td>
    </tr>
  )
}

// Every live project of the organization, newest first (prototypes/projects.html).
export function ProjectsPage({
  organizationId,
  organization,
  canCreate,
}: {
  organizationId: string
  // The organization's slug, for links.
  organization: string
  canCreate: boolean
}) {
  const { data: projects } = useSuspenseQuery(projectsQuery(organizationId))
  const [search, setSearch] = useState('')
  const [customer, setCustomer] = useState('')
  const [onlyMine, setOnlyMine] = useState(false)

  const customers = [...new Set(projects.flatMap((each) => each.customerName ?? []))].sort((a, b) =>
    a.localeCompare(b),
  )
  const needle = normalizeName(search)
  const shown = projects.filter(
    (each) =>
      normalizeName(each.name).includes(needle) &&
      (!customer || each.customerName === customer) &&
      (!onlyMine || each.mine),
  )

  return (
    <main className="flex flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl">{m.projects_title()}</h1>
          <p className="text-muted-foreground text-sm">
            {m.projects_count({ count: projects.length })}
          </p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link to="/$organization/projects/new" params={{ organization }}>
              <PlusIcon />
              {m.projects_add()}
            </Link>
          </Button>
        )}
      </div>

      {projects.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">
          {m.projects_empty()}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full max-w-sm">
              <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                type="search"
                className="pl-9"
                aria-label={m.projects_search()}
                placeholder={m.projects_search()}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="w-full sm:w-64">
              <NativeSelect
                aria-label={m.projects_col_customer()}
                value={customer}
                onChange={(event) => setCustomer(event.target.value)}
              >
                <NativeSelectOption value="">{m.projects_all_customers()}</NativeSelectOption>
                {customers.map((name) => (
                  <NativeSelectOption key={name} value={name}>
                    {name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="accent-primary size-4"
                checked={onlyMine}
                onChange={(event) => setOnlyMine(event.target.checked)}
              />
              {m.projects_only_mine()}
            </label>
          </div>

          {shown.length === 0 ? (
            <p className="text-muted-foreground">{m.projects_no_match()}</p>
          ) : (
            <Card className="py-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="h-10 px-4 font-medium">{m.projects_col_name()}</th>
                      <th className="hidden h-10 px-4 font-medium md:table-cell">
                        {m.projects_col_customer()}
                      </th>
                      <th className="hidden h-10 px-4 font-medium md:table-cell">
                        {m.projects_col_period()}
                      </th>
                      <th className="hidden h-10 px-4 font-medium lg:table-cell">
                        {m.projects_col_technologies()}
                      </th>
                      <th className="h-10 px-4 text-right font-medium">
                        {m.projects_col_people()}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((project) => (
                      <ProjectRow key={project.id} organization={organization} project={project} />
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </main>
  )
}

export function ProjectsPending() {
  return (
    <main className="flex flex-col gap-6 p-4 md:p-8" aria-busy="true">
      <h1 className="text-3xl">{m.projects_title()}</h1>
      <div className="bg-muted h-96 animate-pulse rounded-xl" />
    </main>
  )
}
