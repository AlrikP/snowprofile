import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { technologyCatalogueQuery, technologyNotesQuery } from '#/lib/technology-catalogue'
import { testCatalogue } from '#/test/technology-catalogue'
import { TechnologiesPage } from './technologies-page'

const server = vi.hoisted(() => ({
  getTechnologyCatalogue: vi.fn(),
  getTechnologyNotes: vi.fn(),
  addTechnology: vi.fn(),
  updateTechnology: vi.fn(),
  mergeTechnology: vi.fn(),
  markNotDuplicate: vi.fn(),
}))
vi.mock('#/server/technologies/technologies.functions', () => server)

beforeEach(() => {
  vi.clearAllMocks()
  server.getTechnologyCatalogue.mockResolvedValue(testCatalogue)
  server.getTechnologyNotes.mockResolvedValue([])
})

function renderPage(
  canCurate: boolean,
  catalogue = testCatalogue,
  notes: Record<string, string> = {},
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(technologyCatalogueQuery('org').queryKey, catalogue)
  queryClient.setQueryData(technologyNotesQuery('org').queryKey, new Map(Object.entries(notes)))
  render(
    <QueryClientProvider client={queryClient}>
      <TechnologiesPage organizationId="org" canCurate={canCurate} />
    </QueryClientProvider>,
  )
}

describe('TechnologiesPage', () => {
  it('technology-catalogue.grouped-by-category: lists each category’s technologies with their uses', () => {
    renderPage(false)

    const data = within(screen.getByRole('region', { name: 'Data' }))
    expect(data.getByText('PostgreSQL')).toBeInTheDocument()
    expect(data.getByText('Projects: 20 · People: 41')).toBeInTheDocument()
    expect(data.queryByText('React')).not.toBeInTheDocument()
    const headings = screen.getAllByRole('heading', { level: 2 }).map((each) => each.textContent)
    expect(headings).toEqual(['Frontend', 'Data'])
  })

  it('filters by name', async () => {
    renderPage(false)

    await userEvent.type(screen.getByRole('searchbox'), 'postgre')

    expect(screen.queryByRole('region', { name: 'Frontend' })).not.toBeInTheDocument()
    expect(screen.getByText('Postgres')).toBeInTheDocument()
  })

  it('technology-catalogue.employee-cannot-curate: offers an employee no curation', () => {
    renderPage(false)

    expect(screen.queryByRole('button', { name: /Actions for/ })).not.toBeInTheDocument()
    expect(screen.getByText(/Admins tidy names and categories/)).toBeInTheDocument()
  })

  it('technology-catalogue.duplicate-refused: the add dialog names the existing entry', async () => {
    renderPage(false)

    await userEvent.click(screen.getByRole('button', { name: 'Add technology' }))
    await userEvent.type(screen.getByLabelText('Name'), 'postgre-sql')

    expect(screen.getByRole('status')).toHaveTextContent('PostgreSQL is already in the catalogue.')
    expect(screen.getByLabelText('Name')).toHaveAccessibleDescription(
      expect.stringContaining('PostgreSQL is already in the catalogue.'),
    )
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('the edit dialog ties the duplicate warning to the name field', async () => {
    renderPage(true)

    await userEvent.click(screen.getByRole('button', { name: 'Actions for Angular' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Edit' }))
    const name = screen.getByLabelText('Name')
    expect(name).not.toHaveAccessibleDescription(expect.stringContaining('already'))
    await userEvent.clear(name)
    await userEvent.type(name, 'react')

    expect(name).toHaveAccessibleDescription(
      expect.stringContaining('React is already in the catalogue.'),
    )
  })

  it('technology-catalogue.near-duplicate-warned: the add dialog names a near-duplicate and adds anyway', async () => {
    server.addTechnology.mockImplementation(({ data }: { data: { id: string } }) =>
      Promise.resolve({ id: data.id }),
    )
    renderPage(false)

    await userEvent.click(screen.getByRole('button', { name: 'Add technology' }))
    await userEvent.type(screen.getByLabelText('Name'), 'React.js')

    const warning = 'React is already in the catalogue and may be the same technology.'
    expect(screen.getByRole('status')).toHaveTextContent(warning)
    expect(screen.getByLabelText('Name')).toHaveAccessibleDescription(
      expect.stringContaining(warning),
    )
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Add anyway' }))

    expect(server.addTechnology).toHaveBeenCalledWith({
      data: expect.objectContaining({ name: 'React.js' }),
    })
  })

  it('the edit dialog warns about a near-duplicate name and saves anyway', async () => {
    server.updateTechnology.mockResolvedValue(undefined)
    renderPage(true)

    await userEvent.click(screen.getByRole('button', { name: 'Actions for Angular' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Edit' }))
    const name = screen.getByLabelText('Name')
    await userEvent.clear(name)
    await userEvent.type(name, 'React 18')

    expect(screen.getByRole('status')).toHaveTextContent(
      'React is already in the catalogue and may be the same technology.',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Save anyway' }))
    expect(server.updateTechnology).toHaveBeenCalledWith({
      data: expect.objectContaining({ technologyId: 'angular', name: 'React 18' }),
    })
  })

  it('the edit dialog doesn’t warn about an unchanged name', async () => {
    renderPage(true)

    await userEvent.click(screen.getByRole('button', { name: 'Actions for Postgres' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Edit' }))
    await userEvent.selectOptions(screen.getByLabelText('Category'), 'Frontend')

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
  })

  it('the edit dialog doesn’t warn about a pair marked "Not a duplicate"', async () => {
    renderPage(true, {
      ...testCatalogue,
      distinctPairs: [{ technologyId: 'postgres', otherTechnologyId: 'postgresql' }],
    })

    await userEvent.click(screen.getByRole('button', { name: 'Actions for Postgres' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Edit' }))
    await userEvent.type(screen.getByLabelText('Name'), ' 16')

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
  })

  it('technology-catalogue.employee-adds: adds an entry under the chosen category', async () => {
    server.addTechnology.mockImplementation(({ data }: { data: { id: string } }) =>
      Promise.resolve({ id: data.id }),
    )
    renderPage(false)

    await userEvent.click(screen.getByRole('button', { name: 'Add technology' }))
    await userEvent.type(screen.getByLabelText('Name'), 'Svelte')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(server.addTechnology).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: 'org',
        name: 'Svelte',
        categoryId: 'frontend',
      }),
    })
    expect(await screen.findByRole('button', { name: 'Add technology' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('technology-catalogue.merge-moves-links: an admin merges a duplicate into the entry that stays', async () => {
    server.mergeTechnology.mockResolvedValue(undefined)
    renderPage(true)

    await userEvent.click(screen.getByRole('button', { name: 'Actions for Postgres' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Merge into another' }))
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByText(/Its uses on 2 projects and by 3 people/)).toBeInTheDocument()
    await userEvent.selectOptions(dialog.getByLabelText('Merge into'), 'PostgreSQL')
    await userEvent.click(dialog.getByRole('button', { name: 'Merge' }))

    expect(server.mergeTechnology).toHaveBeenCalledWith({
      data: { organizationId: 'org', technologyId: 'postgres', intoId: 'postgresql' },
    })
  })

  it('technology-catalogue.near-duplicates-listed: an admin sees a near-duplicate pair and merges it', async () => {
    server.mergeTechnology.mockResolvedValue(undefined)
    renderPage(true)

    const duplicates = within(screen.getByRole('region', { name: 'Possible duplicates' }))
    expect(duplicates.getByRole('listitem')).toHaveTextContent(
      'PostgresProjects: 2 · People: 3PostgreSQLProjects: 20 · People: 41',
    )
    await userEvent.click(
      duplicates.getByRole('button', { name: 'Merge Postgres into PostgreSQL' }),
    )
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByLabelText('Merge into')).toHaveValue('postgresql')
    await userEvent.click(dialog.getByRole('button', { name: 'Merge' }))

    expect(server.mergeTechnology).toHaveBeenCalledWith({
      data: { organizationId: 'org', technologyId: 'postgres', intoId: 'postgresql' },
    })
  })

  it('shows an employee no possible duplicates', () => {
    renderPage(false)

    expect(screen.queryByRole('region', { name: 'Possible duplicates' })).not.toBeInTheDocument()
  })

  it('technology-catalogue.near-duplicate-dismissed: "Not a duplicate" is sent, and a dismissed pair stays out', async () => {
    server.markNotDuplicate.mockResolvedValue(undefined)
    renderPage(true)

    await userEvent.click(
      screen.getByRole('button', { name: 'Postgres and PostgreSQL are different technologies' }),
    )
    expect(server.markNotDuplicate).toHaveBeenCalledWith({
      data: { organizationId: 'org', technologyId: 'postgres', otherTechnologyId: 'postgresql' },
    })
  })

  it('leaves out a pair an admin marked "Not a duplicate"', () => {
    renderPage(true, {
      ...testCatalogue,
      distinctPairs: [{ technologyId: 'postgres', otherTechnologyId: 'postgresql' }],
    })

    expect(screen.queryByRole('region', { name: 'Possible duplicates' })).not.toBeInTheDocument()
  })

  it('technology-catalogue.admin-renames: an admin renames an entry', async () => {
    server.updateTechnology.mockResolvedValue(undefined)
    renderPage(true)

    await userEvent.click(screen.getByRole('button', { name: 'Actions for Angular' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Edit' }))
    const name = screen.getByLabelText('Name')
    await userEvent.clear(name)
    await userEvent.type(name, 'AngularJS')
    await userEvent.selectOptions(screen.getByLabelText('Category'), 'Data')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(server.updateTechnology).toHaveBeenCalledWith({
      data: {
        organizationId: 'org',
        technologyId: 'angular',
        name: 'AngularJS',
        categoryId: 'data',
        note: null,
      },
    })
  })

  it('technology-catalogue.note-edited: an admin writes a note, and clears it', async () => {
    server.getTechnologyNotes.mockResolvedValue([{ id: 'react', note: 'Old note' }])
    server.updateTechnology.mockResolvedValue(undefined)
    renderPage(true, testCatalogue, { react: 'Old note' })

    await userEvent.click(screen.getByRole('button', { name: 'Actions for Angular' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Edit' }))
    expect(screen.getByLabelText('Note')).toHaveAccessibleDescription(
      expect.stringContaining('at most 1000 characters'),
    )
    await userEvent.type(screen.getByLabelText('Note'), '  Not AngularJS. https://angular.dev  ')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(server.updateTechnology).toHaveBeenLastCalledWith({
      data: expect.objectContaining({
        technologyId: 'angular',
        note: 'Not AngularJS. https://angular.dev',
      }),
    })

    await userEvent.click(screen.getByRole('button', { name: 'Actions for React' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Edit' }))
    expect(screen.getByLabelText('Note')).toHaveValue('Old note')
    await userEvent.clear(screen.getByLabelText('Note'))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(server.updateTechnology).toHaveBeenLastCalledWith({
      data: expect.objectContaining({ technologyId: 'react', note: null }),
    })
  })

  it('technology-catalogue.note-edited: every member sees a note, with https links only', () => {
    renderPage(false, testCatalogue, {
      postgresql:
        'Docs: https://www.postgresql.org/docs/.\nNot javascript:alert(1) or http://plain.example',
    })

    const data = within(screen.getByRole('region', { name: 'Data' }))
    expect(data.getByText(/^Docs:/)).toHaveTextContent('Not javascript:alert(1)')
    expect(data.getAllByRole('link').map((each) => each.getAttribute('href'))).toEqual([
      'https://www.postgresql.org/docs/',
    ])
    expect(data.getByRole('link')).toHaveAttribute('rel', 'noopener noreferrer')
  })
})
