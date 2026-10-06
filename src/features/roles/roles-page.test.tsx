import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { roleCatalogueQuery } from '#/lib/role-catalogue'
import { testRoles } from '#/test/role-catalogue'
import { RolesPage } from './roles-page'

const server = vi.hoisted(() => ({
  getRoleCatalogue: vi.fn(),
  addRole: vi.fn(),
  updateRole: vi.fn(),
  mergeRole: vi.fn(),
}))
vi.mock('#/server/roles/roles.functions', () => server)

beforeEach(() => {
  vi.clearAllMocks()
  server.getRoleCatalogue.mockResolvedValue(testRoles)
})

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(roleCatalogueQuery('org').queryKey, testRoles)
  render(
    <QueryClientProvider client={queryClient}>
      <RolesPage organizationId="org" />
    </QueryClientProvider>,
  )
}

function row(name: string) {
  const cell = screen.getAllByRole('cell').find((each) => each.textContent?.startsWith(name))
  const tableRow = cell?.closest('tr')
  if (!tableRow) throw new Error(`no row for ${name}`)
  return within(tableRow)
}

describe('RolesPage', () => {
  it('lists the roles with both names and their uses', () => {
    renderPage()

    expect(screen.getAllByRole('row')).toHaveLength(testRoles.length + 1)
    expect(row('Arendaja').getAllByText('Developer')[0]).toBeInTheDocument()
    expect(row('Arendaja').getByText('64')).toBeInTheDocument()
  })

  it('role-catalogue.missing-english-flagged: marks a role without an English name', () => {
    renderPage()

    expect(row('Süsteemianalüütik').getAllByText('No English')[0]).toBeInTheDocument()
    expect(row('Arendaja').queryByText('No English')).not.toBeInTheDocument()
  })

  it('role-catalogue.admin-renames: an admin fills in a missing English name', async () => {
    server.updateRole.mockResolvedValue(undefined)
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Actions for Süsteemianalüütik' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Edit' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Edit role' }))
    expect(dialog.getByLabelText('In Estonian')).toHaveValue('Süsteemianalüütik')
    await userEvent.type(dialog.getByLabelText('In English'), 'Systems analyst')
    await userEvent.click(dialog.getByRole('button', { name: 'Save' }))

    expect(server.updateRole).toHaveBeenCalledWith({
      data: {
        organizationId: 'org',
        roleId: 'system-analyst',
        name: { et: 'Süsteemianalüütik', en: 'Systems analyst' },
      },
    })
  })

  it('a rename keeps its own name without a duplicate warning', async () => {
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Actions for Developer' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Edit' }))

    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
  })

  it('role-catalogue.merge-moves-links: an admin merges a duplicate into the role that stays', async () => {
    server.mergeRole.mockResolvedValue(undefined)
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Actions for Software developer' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Merge into another' }))
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByText(/Its 1 use moves to the chosen role/)).toBeInTheDocument()
    await userEvent.selectOptions(dialog.getByLabelText('Merge into'), 'Developer')
    await userEvent.click(dialog.getByRole('button', { name: 'Merge' }))

    expect(server.mergeRole).toHaveBeenCalledWith({
      data: { organizationId: 'org', roleId: 'software-developer', intoId: 'developer' },
    })
  })

  it('adds a role from the page', async () => {
    server.addRole.mockResolvedValue({ id: 'new' })
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Add role' }))
    await userEvent.type(screen.getByLabelText('In Estonian'), 'Testija')
    await userEvent.type(screen.getByLabelText('In English'), 'Tester')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(server.addRole).toHaveBeenCalledWith({
      data: {
        organizationId: 'org',
        id: expect.any(String),
        name: { et: 'Testija', en: 'Tester' },
      },
    })
  })
})
