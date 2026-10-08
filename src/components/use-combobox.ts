import { type ChangeEvent, type KeyboardEvent, type MouseEvent, useState } from 'react'

// The state and keys the pickers share: a search field whose list of options opens when the
// field gets focus or a click, even empty, so a picker can suggest entries before anything
// is typed. Typing narrows the options; Escape and leaving the field close the list.
export function useCombobox<T>({
  listId,
  options,
  onChoose,
}: {
  listId: string
  // The options for the current query, the suggestions while it is empty.
  options: (query: string) => T[]
  onChoose: (option: T, query: string) => void
}) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [open, setOpen] = useState(false)
  const shown = options(query)
  const expanded = open && shown.length > 0
  // The list can shrink under the highlight, as when the chosen entries change.
  const current = Math.min(active, Math.max(shown.length - 1, 0))

  function choose(option: T) {
    onChoose(option, query)
    setQuery('')
    setActive(0)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' && !expanded) {
      event.preventDefault()
      setOpen(true)
      return
    }
    if (!expanded) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((current + step + shown.length) % shown.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const option = shown[current]
      if (option !== undefined) choose(option)
    } else if (event.key === 'Escape') {
      setQuery('')
      setOpen(false)
    }
  }

  return {
    query,
    options: shown,
    expanded,
    inputProps: {
      role: 'combobox',
      autoComplete: 'off',
      'aria-autocomplete': 'list',
      'aria-controls': listId,
      'aria-expanded': expanded,
      'aria-activedescendant': expanded ? `${listId}-${current}` : undefined,
      value: query,
      onChange: (event: ChangeEvent<HTMLInputElement>) => {
        setQuery(event.target.value)
        setActive(0)
        setOpen(true)
      },
      onFocus: () => setOpen(true),
      onClick: () => setOpen(true),
      onBlur: () => setOpen(false),
      onKeyDown,
    } as const,
    optionProps: (index: number, option: T) => ({
      id: `${listId}-${index}`,
      role: 'option',
      'aria-selected': index === current,
      // Keeps the focus in the field, so the list stays open for the next choice.
      onMouseDown: (event: MouseEvent) => event.preventDefault(),
      onMouseEnter: () => setActive(index),
      onClick: () => choose(option),
    }),
  }
}
