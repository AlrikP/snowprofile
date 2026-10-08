import { SearchIcon, XIcon } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Input } from '#/components/ui/input'
import { useCombobox } from '#/components/use-combobox'
import { formatDate } from '#/lib/date-time'
import { normalizeName } from '#/lib/normalize-name'
import { m } from '#/paraglide/messages.js'
import type { Person } from '#/server/profiles/profiles.functions'

const MAX_OPTIONS = 8

// Picks the CV's people: a combobox that searches by name, with the chosen ones as
// removable badges. Leavers are offered only when asked for; one already chosen stays. An
// empty field suggests everyone in name order.
export function PersonPicker({
  people,
  value,
  leavers,
  onChange,
}: {
  people: Person[]
  value: string[]
  leavers: boolean
  onChange: (ids: string[]) => void
}) {
  const id = 'cv-person'
  const listId = `${id}-options`

  const byId = new Map(people.map((each) => [each.id, each]))
  const chosen = value.flatMap((each) => byId.get(each) ?? [])

  function options(query: string) {
    const needle = normalizeName(query)
    return people
      .filter(
        (each) =>
          !value.includes(each.id) &&
          (leavers || each.leftDate === null) &&
          normalizeName(each.fullName).includes(needle),
      )
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
      .slice(0, MAX_OPTIONS)
  }

  const combobox = useCombobox({
    listId,
    options,
    onChoose: (person) => onChange([...value, person.id]),
  })

  return (
    <div className="flex flex-col gap-3">
      {chosen.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={m.cv_people()}>
          {chosen.map((person) => (
            <li key={person.id}>
              <Badge variant="secondary" className="h-7 gap-1 rounded-md pr-1 pl-2.5 text-sm">
                {person.fullName}
                <button
                  type="button"
                  className="hover:bg-background rounded-sm p-0.5"
                  aria-label={m.cv_remove_person({ name: person.fullName })}
                  onClick={() => onChange(value.filter((each) => each !== person.id))}
                >
                  <XIcon className="size-3.5" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      )}
      <div className="relative">
        <label htmlFor={id} className="sr-only">
          {m.cv_add_person()}
        </label>
        <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input id={id} className="pl-9" placeholder={m.cv_add_person()} {...combobox.inputProps} />
        {combobox.expanded && (
          <div
            id={listId}
            role="listbox"
            aria-label={m.cv_people()}
            className="bg-popover text-popover-foreground absolute top-full left-0 z-50 mt-1 w-full rounded-md border p-1 shadow-md"
          >
            {combobox.options.map((person, index) => (
              <div
                key={person.id}
                className="aria-selected:bg-accent aria-selected:text-accent-foreground flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
                {...combobox.optionProps(index, person)}
              >
                {person.fullName}
                {person.leftDate && (
                  <span className="text-muted-foreground ml-auto text-xs">
                    {m.people_left({ date: formatDate(person.leftDate) })}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
