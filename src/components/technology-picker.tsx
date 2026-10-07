import { PlusIcon, SearchIcon, XIcon } from 'lucide-react'
import { type KeyboardEvent, useState } from 'react'
import { normalizeName } from '#/lib/normalize-name'
import { categoryName, findDuplicate, type TechnologyCatalogue } from '#/lib/technology-catalogue'
import { m } from '#/paraglide/messages.js'
import { AddTechnologyDialog } from './add-technology-dialog'
import { Badge } from './ui/badge'
import { Input } from './ui/input'

const MAX_OPTIONS = 8

type Option = { kind: 'pick'; id: string; name: string; category: string } | { kind: 'add' }

// Picks technologies from the catalogue: a combobox that searches by name, with the chosen
// ones as removable badges. When nothing matches the typed name, it offers to add it, through
// the same dialog as the technologies page, and picks the new entry, unless canAdd is off,
// as where it only filters.
export function TechnologyPicker({
  id,
  label,
  organizationId,
  catalogue,
  value,
  onChange,
  canAdd = true,
}: {
  id: string
  label: string
  organizationId: string
  catalogue: TechnologyCatalogue
  value: string[]
  onChange: (ids: string[]) => void
  canAdd?: boolean
}) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [adding, setAdding] = useState<string | null>(null)
  const listId = `${id}-options`

  const byId = new Map(catalogue.technologies.map((each) => [each.id, each]))
  const categories = new Map(catalogue.categories.map((each) => [each.id, categoryName(each)]))
  const needle = normalizeName(query)
  const options: Option[] = needle
    ? catalogue.technologies
        .filter((each) => !value.includes(each.id) && normalizeName(each.name).includes(needle))
        .slice(0, MAX_OPTIONS)
        .map((each) => ({
          kind: 'pick',
          id: each.id,
          name: each.name,
          category: categories.get(each.categoryId) ?? '',
        }))
    : []
  if (canAdd && needle && !findDuplicate(catalogue.technologies, query)) {
    options.push({ kind: 'add' })
  }
  const expanded = options.length > 0

  function choose(option: Option) {
    if (option.kind === 'add') setAdding(query.trim())
    else onChange([...value, option.id])
    setQuery('')
    setActive(0)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!expanded) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((current) => (current + step + options.length) % options.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const option = options[active]
      if (option) choose(option)
    } else if (event.key === 'Escape') {
      setQuery('')
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label={label}>
          {value.map((technologyId) => {
            const name = byId.get(technologyId)?.name ?? ''
            return (
              <li key={technologyId}>
                <Badge variant="secondary" className="h-7 gap-1 rounded-md pr-1 pl-2.5 text-sm">
                  {name}
                  <button
                    type="button"
                    className="hover:bg-background rounded-sm p-0.5"
                    aria-label={m.technology_remove({ name })}
                    onClick={() => onChange(value.filter((each) => each !== technologyId))}
                  >
                    <XIcon className="size-3.5" />
                  </button>
                </Badge>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">{m.technology_picker_none()}</p>
      )}
      <div className="relative max-w-sm">
        <label htmlFor={id} className="sr-only">
          {m.technology_picker_search()}
        </label>
        <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          id={id}
          className="pl-9"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={expanded}
          aria-activedescendant={expanded ? `${listId}-${active}` : undefined}
          placeholder={m.technology_picker_search()}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setActive(0)
          }}
          onKeyDown={onKeyDown}
        />
        {expanded && (
          <div
            id={listId}
            role="listbox"
            aria-label={label}
            className="bg-popover text-popover-foreground absolute top-full left-0 z-50 mt-1 w-full rounded-md border p-1 shadow-md"
          >
            {options.map((option, index) => (
              <div
                key={option.kind === 'add' ? 'add' : option.id}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                className="aria-selected:bg-accent aria-selected:text-accent-foreground flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(option)}
              >
                {option.kind === 'add' ? (
                  <>
                    <PlusIcon className="size-4" />
                    {m.technology_picker_add({ name: query.trim() })}
                  </>
                ) : (
                  <>
                    {option.name}
                    <span className="text-muted-foreground ml-auto text-xs">{option.category}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {canAdd && (
        <AddTechnologyDialog
          open={adding !== null}
          onOpenChange={(open) => !open && setAdding(null)}
          organizationId={organizationId}
          catalogue={catalogue}
          initialName={adding ?? ''}
          onAdded={(newId) => onChange([...value, newId])}
        />
      )}
    </div>
  )
}
