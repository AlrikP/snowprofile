import { keepPreviousData, useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { FileTextIcon } from 'lucide-react'
import { useState } from 'react'
import { BilingualText } from '#/components/bilingual-text'
import { TechnologyPicker } from '#/components/technology-picker'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { formatDate } from '#/lib/date-time'
import { formatPeriod, formatPeriodDate, readPeriodDate } from '#/lib/period'
import type { SearchFilters } from '#/lib/search-filters'
import { technologyCatalogueQuery } from '#/lib/technology-catalogue'
import { m } from '#/paraglide/messages.js'
import type { SearchItem, SearchResult } from '#/server/search/search.functions'
import { searchQuery } from './search-query'

const MATCHES = [
  { value: 'all', label: m.search_match_all },
  { value: 'any', label: m.search_match_any },
] as const

// A period date typed as text; the URL gets it once it reads as one.
function PeriodField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string | undefined
  onChange: (value: string | undefined) => void
}) {
  const [text, setText] = useState(value ? formatPeriodDate(value) : '')
  const [invalid, setInvalid] = useState(false)
  function commit() {
    if (!text.trim()) {
      setInvalid(false)
      onChange(undefined)
      return
    }
    const read = readPeriodDate(text)
    setInvalid(read === null)
    if (read) onChange(read)
  }
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        inputMode="numeric"
        placeholder="MM-YYYY"
        value={text}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : 'search-period-hint'}
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit()
        }}
      />
      {invalid && (
        <p id={`${id}-error`} className="text-destructive text-xs">
          {m.search_period_invalid()}
        </p>
      )}
    </div>
  )
}

function Item({ organization, item }: { organization: string; item: SearchItem }) {
  const details = [
    item.customerName,
    item.roles.length > 0 ? item.roles : null,
    formatPeriod(item.startDate, item.endDate),
  ]
  return (
    <li className="flex flex-col gap-1.5 py-3">
      <span className="flex flex-wrap items-center gap-2">
        {item.projectId ? (
          <Link
            to="/$organization/projects/$projectId"
            params={{ organization, projectId: item.projectId }}
            className="font-medium underline-offset-4 hover:underline"
          >
            {item.name}
          </Link>
        ) : (
          <span className="font-medium">{item.name}</span>
        )}
        {item.kind === 'own' && <Badge variant="outline">{m.own_badge()}</Badge>}
      </span>
      <span className="text-muted-foreground text-sm">
        {details
          .filter((part) => part !== null)
          .map((part, index) => (
            <span key={index}>
              {index > 0 && ' · '}
              {Array.isArray(part)
                ? part.map((role, roleIndex) => (
                    <span key={roleIndex}>
                      {roleIndex > 0 && ', '}
                      <BilingualText value={role} />
                    </span>
                  ))
                : part}
            </span>
          ))}
      </span>
      <ul className="flex flex-wrap gap-1" aria-label={m.search_technologies()}>
        {item.technologies.map((technology) => (
          <li key={technology.id}>
            <Badge variant={technology.matched ? 'default' : 'secondary'}>{technology.name}</Badge>
          </li>
        ))}
      </ul>
    </li>
  )
}

function Person({
  organization,
  person,
  selected,
  onToggle,
}: {
  organization: string
  person: SearchResult
  selected: boolean
  onToggle: () => void
}) {
  const headingId = `person-${person.id}`
  return (
    <Card role="region" aria-labelledby={headingId} className="gap-3 py-4">
      <CardHeader className="grid-cols-[auto_1fr] items-center gap-x-3 px-4">
        <input
          type="checkbox"
          className="accent-foreground size-4"
          checked={selected}
          onChange={onToggle}
          aria-label={m.search_select_person({ name: person.fullName })}
        />
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id={headingId} className="flex flex-wrap items-center gap-2 text-xl">
            {person.fullName}
            {person.leftDate && (
              <Badge variant="outline">
                {m.people_left({ date: formatDate(person.leftDate) })}
              </Badge>
            )}
          </h2>
          <span className="text-muted-foreground text-sm">
            {m.search_matches({ count: person.items.length })}
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-4 sm:pl-11">
        <ul className="flex flex-col divide-y">
          {person.items.map((item) => (
            <Item key={item.id} organization={organization} item={item} />
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function Results({
  organizationId,
  organization,
  filters,
}: {
  organizationId: string
  organization: string
  filters: SearchFilters
}) {
  const results = useQuery({
    ...searchQuery(organizationId, filters),
    placeholderData: keepPreviousData,
  })
  // People flipped from their default: everyone is chosen for a CV except leavers.
  const [flipped, setFlipped] = useState<ReadonlySet<string>>(new Set())
  if (!results.data) return <p className="text-muted-foreground">{m.search_searching()}</p>
  const people = results.data
  if (people.length === 0) return <p className="text-muted-foreground">{m.search_no_match()}</p>
  function isSelected(person: SearchResult) {
    return (person.leftDate === null) !== flipped.has(person.id)
  }
  const selected = people.filter(isSelected).map((person) => person.id)

  function toggle(id: string) {
    setFlipped((current) => {
      const next = new Set(current)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }

  return (
    <>
      <div className="flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <p className="font-medium" role="status">
          {m.search_results({ count: people.length })}
        </p>
        <Button asChild>
          <Link
            to="/$organization/cvs"
            params={{ organization }}
            search={{ ...filters, people: selected }}
            disabled={selected.length === 0}
          >
            <FileTextIcon />
            {m.search_make_cv({ count: selected.length })}
          </Link>
        </Button>
      </div>
      <div className="flex max-w-5xl flex-col gap-4">
        {people.map((person) => (
          <Person
            key={person.id}
            organization={organization}
            person={person}
            selected={isSelected(person)}
            onToggle={() => toggle(person.id)}
          />
        ))}
      </div>
    </>
  )
}

// People by the technologies they used and when, for admins (prototypes/search.html). The
// filters live in the URL, so a search can be shared and reloaded.
export function SearchPage({
  organizationId,
  organization,
  filters,
  onFiltersChange,
}: {
  organizationId: string
  // The organization's slug, for links.
  organization: string
  filters: SearchFilters
  onFiltersChange: (filters: SearchFilters) => void
}) {
  const { data: catalogue } = useSuspenseQuery(technologyCatalogueQuery(organizationId))
  const technologies = filters.t ?? []
  const match = filters.match ?? 'any'

  function set(next: Partial<SearchFilters>) {
    onFiltersChange({ ...filters, ...next })
  }

  return (
    <main className="flex flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl">{m.search_title()}</h1>
        <p className="text-muted-foreground text-sm">{m.search_description()}</p>
      </div>
      <Card className="max-w-5xl gap-4 py-4">
        <CardContent className="grid gap-4 px-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">{m.search_technologies()}</legend>
            <TechnologyPicker
              id="search-technology"
              label={m.search_technologies()}
              organizationId={organizationId}
              catalogue={catalogue}
              value={technologies}
              onChange={(t) => set({ t: t.length > 0 ? t : undefined })}
            />
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span id="search-match">{m.search_match_label()}</span>
              <div
                role="radiogroup"
                aria-labelledby="search-match"
                className="inline-flex w-fit items-center rounded-md border shadow-xs"
              >
                {MATCHES.map((option) => (
                  <label
                    key={option.value}
                    className="hover:bg-muted has-checked:bg-foreground has-checked:text-background has-focus-visible:ring-ring/50 inline-flex h-8 cursor-pointer items-center border-l px-3 font-medium first:rounded-l-md first:border-l-0 last:rounded-r-md has-focus-visible:ring-[3px]"
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      name="search-match"
                      checked={match === option.value}
                      onChange={() => set({ match: option.value })}
                    />
                    {option.label()}
                  </label>
                ))}
              </div>
            </div>
          </fieldset>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">{m.search_period()}</legend>
            <div className="grid grid-cols-2 gap-2">
              <PeriodField
                id="search-from"
                label={m.search_from()}
                value={filters.from}
                onChange={(from) => set({ from })}
              />
              <PeriodField
                id="search-to"
                label={m.search_to()}
                value={filters.to}
                onChange={(to) => set({ to })}
              />
            </div>
            <p id="search-period-hint" className="text-muted-foreground text-xs">
              {m.search_period_hint()}
            </p>
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="accent-foreground size-4"
                checked={filters.leavers ?? false}
                onChange={(event) => set({ leavers: event.target.checked || undefined })}
              />
              {m.people_show_leavers()}
            </label>
          </fieldset>
        </CardContent>
      </Card>
      {technologies.length === 0 ? (
        <p className="text-muted-foreground">{m.search_prompt()}</p>
      ) : (
        <Results organizationId={organizationId} organization={organization} filters={filters} />
      )}
    </main>
  )
}

export function SearchPending() {
  return (
    <main className="flex flex-col gap-6 p-4 md:p-8" aria-busy="true">
      <h1 className="text-3xl">{m.search_title()}</h1>
      <div className="bg-muted h-48 max-w-5xl animate-pulse rounded-xl" />
    </main>
  )
}
