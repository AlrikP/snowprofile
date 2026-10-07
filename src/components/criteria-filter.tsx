import { type Criterion, criterionLabel } from '#/lib/criteria'
import { m } from '#/paraglide/messages.js'

// The technical characteristics checklist as toggles, for search and CV selection; work
// matches when its project has every chosen one.
export function CriteriaFilter({
  id,
  className,
  criteria,
  value,
  onChange,
}: {
  id: string
  className?: string
  criteria: Criterion[]
  value: string[]
  onChange: (value: string[]) => void
}) {
  const hintId = `${id}-hint`
  return (
    <fieldset className={`flex flex-col gap-2 ${className ?? ''}`} aria-describedby={hintId}>
      <legend className="mb-2 text-sm font-medium">{m.search_characteristics()}</legend>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {criteria.map((criterion) => (
          <label key={criterion.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="accent-foreground size-4"
              checked={value.includes(criterion.id)}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...value, criterion.id]
                    : value.filter((each) => each !== criterion.id),
                )
              }
            />
            {criterionLabel(criterion)}
          </label>
        ))}
      </div>
      <p id={hintId} className="text-muted-foreground text-sm">
        {m.search_characteristics_hint()}
      </p>
    </fieldset>
  )
}
