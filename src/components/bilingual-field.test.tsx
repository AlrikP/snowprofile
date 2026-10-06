import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { type Bilingual, bilingualInputValue, parseBilingual } from '#/lib/bilingual'
import { BilingualField } from './bilingual-field'

function Form({ onSave }: { onSave: (value: Bilingual) => void }) {
  const [value, setValue] = useState(bilingualInputValue(null))
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSave(parseBilingual(value))
      }}
    >
      <BilingualField id="tasks" legend="Tasks" value={value} onChange={setValue} multiline />
      <button type="submit">Save</button>
    </form>
  )
}

describe('BilingualField', () => {
  it('bilingual-content.both-languages-editable: keeps each language as typed', async () => {
    let saved: Bilingual | undefined
    render(<Form onSave={(value) => (saved = value)} />)

    const estonian = screen.getByLabelText('In Estonian')
    expect(estonian).toHaveAttribute('lang', 'et')
    expect(screen.getByLabelText('In English')).toHaveAttribute('lang', 'en')
    await userEvent.type(estonian, 'Liideste arendus')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(saved).toEqual({ et: 'Liideste arendus', en: null })
  })

  it('shows an error on both fields', () => {
    render(
      <BilingualField
        id="name"
        legend="Name"
        value={{ et: '', en: '' }}
        onChange={() => {}}
        error="Fill in at least one language."
      />,
    )

    expect(screen.getByLabelText('In Estonian')).toHaveAccessibleDescription(
      'Fill in at least one language.',
    )
    expect(screen.getByLabelText('In English')).toHaveAttribute('aria-invalid', 'true')
  })

  it('describes both fields with the hint, then the error', () => {
    render(
      <BilingualField
        id="name"
        legend="Name"
        value={{ et: '', en: '' }}
        onChange={() => {}}
        hint="The list flags a missing translation."
        error="Fill in at least one language."
      />,
    )

    for (const label of ['In Estonian', 'In English']) {
      expect(screen.getByLabelText(label)).toHaveAccessibleDescription(
        'The list flags a missing translation. Fill in at least one language.',
      )
    }
  })

  it('keeps a hidden legend as the group’s name', () => {
    const value = bilingualInputValue(null)
    render(
      <BilingualField id="d" legend="Description" value={value} onChange={() => {}} hideLegend />,
    )

    expect(screen.getByRole('group', { name: 'Description' })).toBeInTheDocument()
    expect(screen.getByText('Description')).toHaveClass('sr-only')
  })
})
