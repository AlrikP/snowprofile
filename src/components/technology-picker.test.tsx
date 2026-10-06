import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { testCatalogue } from '#/test/technology-catalogue'
import { TechnologyPicker } from './technology-picker'

vi.mock('#/server/technologies/technologies.functions', () => ({
  getTechnologyCatalogue: vi.fn(),
  addTechnology: vi.fn(),
}))

function Picker({ initial = [] as string[] }) {
  const [value, setValue] = useState(initial)
  return (
    <QueryClientProvider client={new QueryClient()}>
      <TechnologyPicker
        id="technologies"
        label="Technologies"
        organizationId="org"
        catalogue={testCatalogue}
        value={value}
        onChange={setValue}
      />
    </QueryClientProvider>
  )
}

describe('TechnologyPicker', () => {
  it('picks a technology by name and removes it again', async () => {
    render(<Picker />)

    await userEvent.type(screen.getByRole('combobox'), 'rea')
    await userEvent.click(screen.getByRole('option', { name: /React/ }))

    expect(screen.getByRole('list', { name: 'Technologies' })).toHaveTextContent('React')
    await userEvent.click(screen.getByRole('button', { name: 'Remove React' }))
    expect(screen.getByText('No technologies chosen.')).toBeInTheDocument()
  })

  it('picks with the keyboard and leaves out the ones already chosen', async () => {
    render(<Picker initial={['postgresql']} />)

    await userEvent.type(screen.getByRole('combobox'), 'postgre')
    expect(screen.getAllByRole('option').map((each) => each.textContent)).toEqual([
      'PostgresData',
      'Add to the catalogue: postgre',
    ])
    await userEvent.keyboard('{Enter}')

    expect(screen.getByRole('list', { name: 'Technologies' })).toHaveTextContent(
      'PostgreSQLPostgres',
    )
  })

  it('technology-catalogue.picker-adds-missing: offers to add a name nothing matches', async () => {
    render(<Picker />)

    await userEvent.type(screen.getByRole('combobox'), 'Svelte')
    await userEvent.click(screen.getByRole('option', { name: 'Add to the catalogue: Svelte' }))

    expect(screen.getByRole('dialog', { name: 'Add technology' })).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveValue('Svelte')
  })
})
