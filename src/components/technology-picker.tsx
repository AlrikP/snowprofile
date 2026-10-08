import { PlusIcon, SearchIcon, XIcon } from 'lucide-react'
import { useState } from 'react'
import { normalizeName } from '#/lib/normalize-name'
import { categoryName, findDuplicate, type TechnologyCatalogue } from '#/lib/technology-catalogue'
import { m } from '#/paraglide/messages.js'
import { AddTechnologyDialog } from './add-technology-dialog'
import { Badge } from './ui/badge'
import { Input } from './ui/input'
import { useCombobox } from './use-combobox'

const MAX_OPTIONS = 8

type Option = { kind: 'pick'; id: string; name: string; category: string } | { kind: 'add' }

// Picks technologies from the catalogue: a combobox that searches by name, with the chosen
// ones as removable badges. When nothing matches the typed name, it offers to add it, through
// the same dialog as the technologies page, and picks the new entry, unless canAdd is off,
// as where it only filters. An empty field suggests the suggested IDs first, such as a
// participation's project's technologies, then the entries most projects use.
export function TechnologyPicker({
  id,
  label,
  organizationId,
  catalogue,
  value,
  onChange,
  canAdd = true,
  suggested = [],
}: {
  id: string
  label: string
  organizationId: string
  catalogue: TechnologyCatalogue
  value: string[]
  onChange: (ids: string[]) => void
  canAdd?: boolean
  suggested?: string[]
}) {
  const [adding, setAdding] = useState<string | null>(null)
  const listId = `${id}-options`

  const byId = new Map(catalogue.technologies.map((each) => [each.id, each]))
  const categories = new Map(catalogue.categories.map((each) => [each.id, categoryName(each)]))

  function options(query: string): Option[] {
    const needle = normalizeName(query)
    const unchosen = catalogue.technologies.filter((each) => !value.includes(each.id))
    const found = needle
      ? unchosen.filter((each) => normalizeName(each.name).includes(needle))
      : [
          ...suggested.flatMap((each) => (value.includes(each) ? [] : (byId.get(each) ?? []))),
          ...unchosen
            .filter((each) => !suggested.includes(each.id))
            .sort((a, b) => b.projects - a.projects),
        ]
    const picks: Option[] = found.slice(0, MAX_OPTIONS).map((each) => ({
      kind: 'pick',
      id: each.id,
      name: each.name,
      category: categories.get(each.categoryId) ?? '',
    }))
    if (canAdd && needle && !findDuplicate(catalogue.technologies, query)) {
      picks.push({ kind: 'add' })
    }
    return picks
  }

  const combobox = useCombobox({
    listId,
    options,
    onChoose: (option, query) => {
      if (option.kind === 'add') setAdding(query.trim())
      else onChange([...value, option.id])
    },
  })

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
          placeholder={m.technology_picker_search()}
          {...combobox.inputProps}
        />
        {combobox.expanded && (
          <div
            id={listId}
            role="listbox"
            aria-label={label}
            className="bg-popover text-popover-foreground absolute top-full left-0 z-50 mt-1 w-full rounded-md border p-1 shadow-md"
          >
            {combobox.options.map((option, index) => (
              <div
                key={option.kind === 'add' ? 'add' : option.id}
                className="aria-selected:bg-accent aria-selected:text-accent-foreground flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
                {...combobox.optionProps(index, option)}
              >
                {option.kind === 'add' ? (
                  <>
                    <PlusIcon className="size-4" />
                    {m.technology_picker_add({ name: combobox.query.trim() })}
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
