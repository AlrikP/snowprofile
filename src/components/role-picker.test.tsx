import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { testRoles } from '#/test/role-catalogue'
import { RolePicker } from './role-picker'

const server = vi.hoisted(() => ({ getRoleCatalogue: vi.fn(), addRole: vi.fn() }))
vi.mock('#/server/roles/roles.functions', () => server)

beforeEach(() => {
  vi.clearAllMocks()
  server.getRoleCatalogue.mockResolvedValue(testRoles)
})

function Picker({ initial = [] as string[], canAdd = true }) {
  const [value, setValue] = useState(initial)
  return (
    <QueryClientProvider client={new QueryClient()}>
      <RolePicker
        id="roles"
        label="Roles"
        organizationId="org"
        catalogue={testRoles}
        value={value}
        onChange={setValue}
        canAdd={canAdd}
      />
    </QueryClientProvider>
  )
}

describe('RolePicker', () => {
  it('searches both names and picks several roles', async () => {
    render(<Picker />)

    await userEvent.type(screen.getByRole('combobox'), 'arendaja')
    expect(screen.getAllByRole('option').map((each) => each.textContent)).toEqual([
      'Developer',
      'Software developer',
    ])
    await userEvent.click(screen.getByRole('option', { name: 'Developer' }))
    await userEvent.type(screen.getByRole('combobox'), 'analyst')
    await userEvent.keyboard('{Enter}')

    expect(screen.getByRole('list', { name: 'Roles' })).toHaveTextContent('DeveloperAnalyst')
    await userEvent.click(screen.getByRole('button', { name: 'Remove Developer' }))
    expect(screen.getByRole('list', { name: 'Roles' })).toHaveTextContent('Analyst')
  })

  it('role-catalogue.picker-suggests: an empty field suggests the roles not chosen, most used first', async () => {
    render(<Picker initial={['developer']} />)

    await userEvent.click(screen.getByRole('combobox'))
    expect(screen.getAllByRole('option').map((each) => each.textContent)).toEqual([
      'Analyst',
      'Süsteemianalüütik',
      'Software developer',
    ])
    await userEvent.keyboard('{ArrowDown}{Enter}')
    expect(screen.getByRole('list', { name: 'Roles' })).toHaveTextContent(
      'DeveloperSüsteemianalüütik',
    )
    // Typing narrows the suggestions as before.
    await userEvent.type(screen.getByRole('combobox'), 'soft')
    expect(screen.getAllByRole('option').map((each) => each.textContent)).toEqual([
      'Software developer',
      'Add a new role: soft',
    ])
  })

  it('role-catalogue.added: adds a missing role through the dialog and picks it', async () => {
    server.addRole.mockImplementation(({ data }: { data: { id: string } }) =>
      Promise.resolve({ id: data.id }),
    )
    render(<Picker />)

    await userEvent.type(screen.getByRole('combobox'), 'Tester')
    await userEvent.click(screen.getByRole('option', { name: 'Add a new role: Tester' }))
    const dialog = within(screen.getByRole('dialog', { name: 'New role' }))
    expect(dialog.getByLabelText('In English')).toHaveValue('Tester')
    await userEvent.type(dialog.getByLabelText('In Estonian'), 'Testija')
    await userEvent.click(dialog.getByRole('button', { name: 'Save' }))

    expect(server.addRole).toHaveBeenCalledWith({
      data: {
        organizationId: 'org',
        id: expect.any(String),
        name: { et: 'Testija', en: 'Tester' },
      },
    })
    expect(await screen.findByRole('list', { name: 'Roles' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('role-catalogue.both-names-required: the dialog doesn’t save with one name', async () => {
    render(<Picker />)

    await userEvent.type(screen.getByRole('combobox'), 'Tester')
    await userEvent.click(screen.getByRole('option', { name: 'Add a new role: Tester' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(screen.getByLabelText('In Estonian')).toHaveAccessibleDescription(
      'Fill in both languages.',
    )
    expect(server.addRole).not.toHaveBeenCalled()
  })

  it('role-catalogue.duplicate-refused: the dialog names the existing entry', async () => {
    render(<Picker />)

    await userEvent.type(screen.getByRole('combobox'), 'Uus')
    await userEvent.click(screen.getByRole('option', { name: 'Add a new role: Uus' }))
    await userEvent.type(screen.getByLabelText('In Estonian'), ' arendaja ')

    expect(screen.getByLabelText('In Estonian')).toHaveAccessibleDescription(
      'Developer is already in the list.',
    )
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('offers no new role when a name matches an entry exactly', async () => {
    render(<Picker />)

    await userEvent.type(screen.getByRole('combobox'), 'analüütik')

    expect(screen.queryByRole('option', { name: /Add a new role/ })).not.toBeInTheDocument()
  })

  it('offers nothing to add when adding is off', async () => {
    render(<Picker canAdd={false} />)

    await userEvent.type(screen.getByRole('combobox'), 'arhitekt')

    expect(screen.queryByRole('option')).not.toBeInTheDocument()
  })
})
