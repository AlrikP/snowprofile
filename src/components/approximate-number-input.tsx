import {
  type ApproximateNumberInputValue,
  type Qualifier,
  QUALIFIERS,
  qualifierLabel,
} from '#/lib/approximate-number'
import { m } from '#/paraglide/messages.js'
import { Input } from './ui/input'
import { NativeSelect, NativeSelectOption } from './ui/native-select'

function isQualifier(value: string): value is Qualifier {
  return (QUALIFIERS as readonly string[]).includes(value)
}

// A whole number with its precision (exactly, approximately, more than). An empty number
// means unknown, whatever the precision says.
export function ApproximateNumberInput({
  id,
  legend,
  value,
  onChange,
  invalid = false,
}: {
  id: string
  legend: string
  value: ApproximateNumberInputValue
  onChange: (value: ApproximateNumberInputValue) => void
  invalid?: boolean
}) {
  const errorId = `${id}-error`
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm leading-none font-medium">{legend}</legend>
      <div className="grid grid-cols-[minmax(0,10rem)_1fr] gap-2">
        <NativeSelect
          aria-label={m.qualifier_label()}
          value={value.qualifier}
          onChange={(event) => {
            if (isQualifier(event.target.value))
              onChange({ ...value, qualifier: event.target.value })
          }}
        >
          {QUALIFIERS.map((qualifier) => (
            <NativeSelectOption key={qualifier} value={qualifier}>
              {qualifierLabel(qualifier)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <Input
          id={id}
          inputMode="numeric"
          aria-label={legend}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? errorId : undefined}
          value={value.value}
          onChange={(event) => onChange({ ...value, value: event.target.value })}
        />
      </div>
      {invalid && (
        <p id={errorId} className="text-destructive text-sm">
          {m.number_invalid()}
        </p>
      )}
    </fieldset>
  )
}
