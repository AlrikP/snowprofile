import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { type ParsedPeriod, parsePeriodInput, periodInputValue } from '#/lib/period'
import { PeriodInput } from './period-input'

function Form({
  startDate = null,
  endDate = null,
  onSave,
}: {
  startDate?: string | null
  endDate?: string | null
  onSave: (period: ParsedPeriod) => void
}) {
  const [value, setValue] = useState(periodInputValue(startDate, endDate))
  const [errors, setErrors] = useState({})
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        const parsed = parsePeriodInput(value)
        setErrors(parsed.ok ? {} : parsed)
        onSave(parsed)
      }}
    >
      <PeriodInput id="period" legend="Period" value={value} onChange={setValue} errors={errors} />
      <button type="submit">Save</button>
    </form>
  )
}

function group(name: string) {
  return within(screen.getByRole('group', { name }))
}

describe('PeriodInput', () => {
  it('saves a day, a month, and a year', async () => {
    let saved: ParsedPeriod | undefined
    render(<Form onSave={(period) => (saved = period)} />)

    await userEvent.type(group('Start').getByLabelText('Day'), '5')
    await userEvent.selectOptions(group('Start').getByLabelText('Month'), 'March')
    await userEvent.type(group('Start').getByLabelText('Year'), '2024')
    await userEvent.type(group('End').getByLabelText('Year'), '2025')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(saved).toEqual({ ok: true, startDate: '2024-03-05', endDate: '2025' })
  })

  it('ticking Ongoing disables the end and keeps it; saving clears it', async () => {
    let saved: ParsedPeriod | undefined
    render(<Form startDate="2024-03" endDate="2025-01" onSave={(period) => (saved = period)} />)

    await userEvent.click(screen.getByLabelText('Ongoing'))
    expect(group('End').getByLabelText('Year')).toBeDisabled()
    await userEvent.click(screen.getByLabelText('Ongoing'))
    expect(group('End').getByLabelText('Year')).toHaveValue('2025')

    await userEvent.click(screen.getByLabelText('Ongoing'))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(saved).toEqual({ ok: true, startDate: '2024-03', endDate: null })
  })

  it('explains an end before the start at the end fields', async () => {
    render(<Form startDate="2024-03" endDate="2024-02" onSave={() => {}} />)

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    const year = group('End').getByLabelText('Year')
    expect(year).toHaveAttribute('aria-invalid', 'true')
    expect(year).toHaveAccessibleDescription(/The end can’t be before the start\./)
  })

  it('suggests a month for a start known only to the year', async () => {
    render(<Form onSave={() => {}} />)

    await userEvent.type(group('Start').getByLabelText('Year'), '2019')

    expect(screen.getByText(/A year alone is vague in a CV/)).toBeInTheDocument()
  })
})
