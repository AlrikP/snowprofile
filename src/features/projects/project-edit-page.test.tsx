import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Customer, ProjectForm, ProjectListItem } from '#/server/projects/projects.functions'
import { renderPage } from '#/test/router'
import { ProjectEditPage } from './project-edit-page'
import { customersQuery, projectFormQuery, projectsQuery } from './projects-query'

const server = vi.hoisted(() => ({
  getProjects: vi.fn(),
  getProject: vi.fn(),
  getProjectForm: vi.fn(),
  getCustomers: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
}))
vi.mock('#/server/projects/projects.functions', () => server)

const customers: Customer[] = [
  { id: 'elering', name: 'Elering' },
  { id: 'smin', name: 'Siseministeerium' },
]

const stored: ProjectForm = {
  id: 'portal',
  name: 'Kodanikuportaali uuendus',
  customerId: 'smin',
  description: { et: 'Uus kodanikuportaal.', en: null },
  startDate: '2024-03',
  endDate: '2025-06',
  tenderReference: '275431',
  totalHours: { value: 4200, qualifier: 'approximately' },
  cost: null,
  lastChange: { at: new Date('2026-10-06T14:05:00'), by: 'Anna Admin' },
}

function listItem(overrides: Partial<ProjectListItem>): ProjectListItem {
  return {
    id: 'grid',
    name: 'Võrguandmete platvorm',
    customerName: 'Elering',
    startDate: '2023-09',
    endDate: null,
    descriptionEt: null,
    descriptionEn: null,
    people: 3,
    mine: false,
    technologies: [],
    ...overrides,
  }
}

const projects = [listItem({}), listItem({ id: 'portal', name: stored.name })]

beforeEach(() => {
  vi.clearAllMocks()
  server.createProject.mockImplementation(({ data }: { data: { id: string } }) =>
    Promise.resolve({ id: data.id }),
  )
  server.updateProject.mockResolvedValue(undefined)
  server.deleteProject.mockResolvedValue(undefined)
  server.getProjects.mockResolvedValue(projects)
  server.getCustomers.mockResolvedValue(customers)
  server.getProjectForm.mockResolvedValue(stored)
})

function show(projectId: string | null, { canDelete = true } = {}) {
  return renderPage(
    <ProjectEditPage
      organizationId="org"
      organization="demo"
      projectId={projectId}
      canDelete={canDelete}
    />,
    [
      [projectsQuery('org').queryKey, projects],
      [customersQuery('org').queryKey, customers],
      [projectFormQuery('org', 'portal').queryKey, stored],
    ],
  )
}

function saved(mock: typeof server.createProject) {
  return mock.mock.calls[0]?.[0]?.data
}

function period(name: 'Start' | 'End') {
  return within(screen.getByRole('group', { name }))
}

describe('ProjectEditPage', () => {
  it('fills the form with the stored project', async () => {
    await show('portal')

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(stored.name)
    expect(screen.getByLabelText('Name')).toHaveValue(stored.name)
    expect(screen.getByRole('combobox', { name: 'Customer' })).toHaveValue('smin')
    expect(period('Start').getByLabelText('Year')).toHaveValue('2024')
    expect(period('End').getByLabelText('Month')).toHaveValue('6')
    expect(screen.getByLabelText('In Estonian')).toHaveValue('Uus kodanikuportaal.')
    expect(screen.getByLabelText('Tender reference number')).toHaveValue('275431')
    expect(screen.getByRole('textbox', { name: 'Total hours' })).toHaveValue('4200')
    expect(screen.getByText(/^Last changed .* by Anna Admin$/)).toBeInTheDocument()
  })

  it('projects.year-only-period: saves a new project with a year-only start, ongoing', async () => {
    await show(null)

    await userEvent.type(screen.getByLabelText('Name'), 'Uus portaal')
    await userEvent.type(period('Start').getByLabelText('Year'), '2019')
    expect(screen.getByText(/A year alone is vague/)).toBeInTheDocument()
    await userEvent.type(screen.getByRole('textbox', { name: 'Cost' }), '250 000')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(saved(server.createProject)).toMatchObject({
      organizationId: 'org',
      name: 'Uus portaal',
      customer: null,
      period: { startDate: '2019', endDate: null },
      tenderReference: '',
      totalHours: null,
      cost: { value: 250000, qualifier: 'approximately' },
    })
  })

  it('projects.ongoing-clears-end: saving with Ongoing ticked clears the end date', async () => {
    await show('portal')

    await userEvent.click(screen.getByRole('checkbox', { name: 'Ongoing' }))
    expect(period('End').getByLabelText('Year')).toHaveValue('2025')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(saved(server.updateProject)).toMatchObject({
      projectId: 'portal',
      period: { startDate: '2024-03', endDate: null },
    })
  })

  it('projects.end-before-start-refused: an end before the start is not saved', async () => {
    await show('portal')

    const end = period('End').getByLabelText('Year')
    await userEvent.clear(end)
    await userEvent.type(end, '2023')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(screen.getByText('The end can’t be before the start.')).toBeInTheDocument()
    expect(server.updateProject).not.toHaveBeenCalled()
  })

  it('asks for a name', async () => {
    await show(null)

    await userEvent.type(period('Start').getByLabelText('Year'), '2024')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(screen.getByText('Enter the project’s name.')).toBeInTheDocument()
    expect(server.createProject).not.toHaveBeenCalled()
  })

  it('projects.similar-name-warned: warns about a similar name but still saves', async () => {
    await show(null)

    await userEvent.type(screen.getByLabelText('Name'), 'Võrguandmete-platvorm')
    const warning = screen.getByRole('status')
    expect(warning).toHaveTextContent(
      'A project with a similar name exists: Võrguandmete platvorm (Elering).',
    )
    expect(within(warning).getByRole('link')).toHaveAttribute('href', '/demo/projects/grid')

    await userEvent.type(period('Start').getByLabelText('Year'), '2024')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(saved(server.createProject)).toMatchObject({ name: 'Võrguandmete-platvorm' })
  })

  it('doesn’t warn about the project’s own name', async () => {
    await show('portal')

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('adds a new customer, stored with the project', async () => {
    await show('portal')

    await userEvent.click(screen.getByRole('button', { name: 'Add customer' }))
    const dialog = within(screen.getByRole('dialog'))
    await userEvent.type(dialog.getByLabelText('Name'), 'Telia Eesti')
    await userEvent.click(dialog.getByRole('button', { name: 'Save' }))

    const select = screen.getByRole('combobox', { name: 'Customer' })
    expect(within(select).getByRole('option', { selected: true })).toHaveTextContent('Telia Eesti')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(saved(server.updateProject)?.customer).toMatchObject({
      kind: 'new',
      name: 'Telia Eesti',
    })
  })

  it('picks the existing customer when the new name matches one', async () => {
    await show('portal')

    await userEvent.click(screen.getByRole('button', { name: 'Add customer' }))
    await userEvent.type(within(screen.getByRole('dialog')).getByLabelText('Name'), 'elering')
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save' }))

    expect(screen.getByRole('combobox', { name: 'Customer' })).toHaveValue('elering')
    expect(server.updateProject).not.toHaveBeenCalled()
  })

  it('deletes the project after confirming', async () => {
    await show('portal')

    await userEvent.click(screen.getByRole('button', { name: 'Delete project' }))
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByText(`Delete “${stored.name}”?`)).toBeInTheDocument()
    await userEvent.click(dialog.getByRole('button', { name: 'Delete project' }))

    expect(server.deleteProject).toHaveBeenCalledWith({
      data: { organizationId: 'org', projectId: 'portal' },
    })
  })

  it('offers no delete without the permission', async () => {
    await show('portal', { canDelete: false })
    expect(screen.queryByRole('button', { name: 'Delete project' })).not.toBeInTheDocument()
  })
})
