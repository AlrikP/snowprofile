import { PlusIcon, SearchIcon, XIcon } from 'lucide-react'
import { type KeyboardEvent, useState } from 'react'
import { normalizeName } from '#/lib/normalize-name'
import { type RoleCatalogue, roleLabel, roleMatches } from '#/lib/role-catalogue'
import { m } from '#/paraglide/messages.js'
import { getLocale } from '#/paraglide/runtime.js'
import { RoleDialog } from './role-dialog'
import { Badge } from './ui/badge'
import { Input } from './ui/input'

const MAX_OPTIONS = 8

type Option = { kind: 'pick'; id: string; name: string } | { kind: 'add' }

// Picks roles from the catalogue: a combobox that searches both names, with the chosen ones
// as removable badges. When no entry has the typed name in either language, it offers to
// add one, through the same dialog as the roles page, and picks the new entry, unless
// canAdd is off, as where it only filters.
export function RolePicker({
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
  catalogue: RoleCatalogue
  value: string[]
  onChange: (ids: string[]) => void
  canAdd?: boolean
}) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [adding, setAdding] = useState<string | null>(null)
  const listId = `${id}-options`

  const byId = new Map(catalogue.map((each) => [each.id, each]))
  const needle = normalizeName(query)
  const options: Option[] = needle
    ? catalogue
        .filter((each) => !value.includes(each.id) && roleMatches(each, needle))
        .slice(0, MAX_OPTIONS)
        .map((each) => ({ kind: 'pick', id: each.id, name: roleLabel(each) }))
    : []
  const exact = catalogue.some((each) =>
    [each.nameEt, each.nameEn].some((name) => name && normalizeName(name) === needle),
  )
  if (canAdd && needle && !exact) options.push({ kind: 'add' })
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
          {value.map((roleId) => {
            const role = byId.get(roleId)
            const name = role ? roleLabel(role) : ''
            return (
              <li key={roleId}>
                <Badge variant="secondary" className="h-7 gap-1 rounded-md pr-1 pl-2.5 text-sm">
                  {name}
                  <button
                    type="button"
                    className="hover:bg-background rounded-sm p-0.5"
                    aria-label={m.role_remove({ name })}
                    onClick={() => onChange(value.filter((each) => each !== roleId))}
                  >
                    <XIcon className="size-3.5" />
                  </button>
                </Badge>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">{m.role_picker_none()}</p>
      )}
      <div className="relative max-w-sm">
        <label htmlFor={id} className="sr-only">
          {m.role_picker_search()}
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
          placeholder={m.role_picker_search()}
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
                    {m.role_picker_add({ name: query.trim() })}
                  </>
                ) : (
                  option.name
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {canAdd && (
        <RoleDialog
          open={adding !== null}
          onClose={() => setAdding(null)}
          organizationId={organizationId}
          catalogue={catalogue}
          role={null}
          // The typed name fills the field of the UI language.
          initialName={
            getLocale() === 'en' ? { et: '', en: adding ?? '' } : { et: adding ?? '', en: '' }
          }
          onSaved={(newId) => onChange([...value, newId])}
        />
      )}
    </div>
  )
}
