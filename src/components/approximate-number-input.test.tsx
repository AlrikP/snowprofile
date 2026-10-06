import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import {
  type ApproximateNumber,
  approximateNumberInputValue,
  parseApproximateNumber,
} from '#/lib/approximate-number'
import { ApproximateNumberInput } from './approximate-number-input'

function Form({ onSave }: { onSave: (value: ApproximateNumber | null | 'invalid') => void }) {
  const [value, setValue] = useState(approximateNumberInputValue(null))
  const [invalid, setInvalid] = useState(false)
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        const parsed = parseApproximateNumber(value)
        setInvalid(!parsed.ok)
        onSave(parsed.ok ? parsed.value : 'invalid')
      }}
    >
      <ApproximateNumberInput
        id="hours"
        legend="Total hours"
        value={value}
        onChange={setValue}
        invalid={invalid}
      />
      <button type="submit">Save</button>
    </form>
  )
}

describe('ApproximateNumberInput', () => {
  it('saves a number with its precision', async () => {
    let saved: ApproximateNumber | null | 'invalid' | undefined
    render(<Form onSave={(value) => (saved = value)} />)

    await userEvent.selectOptions(screen.getByLabelText('Precision'), 'more than')
    await userEvent.type(screen.getByRole('textbox', { name: 'Total hours' }), '10 000')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(saved).toEqual({ value: 10000, qualifier: 'more_than' })
  })

  it('refuses a number that isn’t whole', async () => {
    render(<Form onSave={() => {}} />)

    const field = screen.getByRole('textbox', { name: 'Total hours' })
    await userEvent.type(field, '~3500')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(field).toHaveAccessibleDescription('Enter a whole number.')
  })
})
