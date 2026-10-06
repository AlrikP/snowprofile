// A choice of a few options as joined buttons, the chosen one filled. Each option is a
// radio, so arrow keys move between them.
export function RadioToggle<T extends string>({
  name,
  labelledBy,
  options,
  value,
  onChange,
}: {
  name: string
  labelledBy: string
  options: readonly { value: T; label: string; lang?: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className="inline-flex w-fit items-center rounded-md border text-sm shadow-xs"
    >
      {options.map((option) => (
        <label
          key={option.value}
          lang={option.lang}
          className="hover:bg-muted has-checked:bg-foreground has-checked:text-background has-focus-visible:ring-ring/50 inline-flex h-8 cursor-pointer items-center border-l px-3 font-medium first:rounded-l-md first:border-l-0 last:rounded-r-md has-focus-visible:ring-[3px]"
        >
          <input
            type="radio"
            className="sr-only"
            name={name}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          {option.label}
        </label>
      ))}
    </div>
  )
}
