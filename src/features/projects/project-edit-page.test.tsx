import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { projectsQuery } from '#/lib/project-list'
import { technologyCatalogueQuery } from '#/lib/technology-catalogue'
import type {
  ChecklistItem,
  Contact,
  Customer,
  ProjectForm,
  ProjectListItem,
} from '#/server/projects/projects.functions'
import { renderPage } from '#/test/router'
import { testCatalogue } from '#/test/technology-catalogue'
import { ProjectEditPage } from './project-edit-page'
import { checklistQuery, contactsQuery, customersQuery, projectFormQuery } from './projects-query'

const server = vi.hoisted(() => ({
  getProjects: vi.fn(),
  getProject: vi.fn(),
  getProjectForm: vi.fn(),
  getCustomers: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
  getContacts: vi.fn(),
  addContact: vi.fn(),
  updateContact: vi.fn(),
  deleteContact: vi.fn(),
  getChecklist: vi.fn(),
  addProjectTechnology: vi.fn(),
}))
vi.mock('#/server/technologies/technologies.functions', () => ({
  getTechnologyCatalogue: vi.fn(),
  addTechnology: vi.fn(),
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
  contactIds: ['mari'],
  technologyIds: ['react'],
  participantTechnologies: [{ id: 'angular', name: 'Angular', people: 2 }],
  answers: [{ criterionId: 'tests', answer: true, note: 'JUnit' }],
  description: { et: 'Uus kodanikuportaal.', en: null },
  startDate: '2024-03',
  endDate: '2025-06',
  tenderReference: '275431',
  totalHours: { value: 4200, qualifier: 'approximately' },
  cost: null,
  lastChange: { at: new Date('2026-10-06T14:05:00'), by: 'Anna Admin' },
}

const checklist: ChecklistItem[] = [
  { id: 'tests', name: { et: 'Automaattestid', en: 'Automated tests' } },
  { id: 'xroad', name: { et: 'X-tee', en: 'X-Road' } },
  { id: 'k8s', name: { et: 'Kubernetes', en: 'Kubernetes' } },
]

const contacts: Contact[] = [
  {
    id: 'mari',
    name: 'Mari Mets',
    email: 'mari@example.ee',
    phone: '+372 612 5000',
    noLongerValid: false,
    note: null,
  },
  {
    id: 'juri',
    name: 'Jüri Jõe',
    email: null,
    phone: null,
    noLongerValid: true,
    note: 'Ei tööta enam ministeeriumis.',
  },
]

function listItem(overrides: Partial<ProjectListItem>): ProjectListItem {
  return {
    id: 'grid',
    name: 'Võrguandmete platvorm',
    customerName: 'Elering',
    startDate: '2023-09',
    endDate: null,
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
  server.getContacts.mockResolvedValue(contacts)
  server.addContact.mockResolvedValue({ id: 'new' })
  server.updateContact.mockResolvedValue(undefined)
  server.deleteContact.mockResolvedValue(undefined)
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
      [contactsQuery('org', 'smin').queryKey, contacts],
      [checklistQuery('org').queryKey, checklist],
      [technologyCatalogueQuery('org').queryKey, testCatalogue],
    ],
  )
}

function saved(mock: typeof server.createProject) {
  return mock.mock.calls[0]?.[0]?.data
}

// The stored project has a contact, so another customer asks first.
async function confirmCustomerChange() {
  await userEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Change customer' }),
  )
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
    await confirmCustomerChange()

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
    await confirmCustomerChange()

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

  describe('contact persons', () => {
    function contactsSection() {
      return within(screen.getByRole('region', { name: 'Contact persons' }))
    }

    it('lists the customer’s contacts, ticking the project’s, and saves the ticks', async () => {
      await show('portal')

      const section = contactsSection()
      expect(section.getByRole('checkbox', { name: 'Mari Mets' })).toBeChecked()
      const juri = section.getByRole('checkbox', { name: /Jüri Jõe/ })
      expect(juri).not.toBeChecked()
      expect(section.getByText('No longer valid')).toBeInTheDocument()
      expect(section.getByText('Ei tööta enam ministeeriumis.')).toBeInTheDocument()

      await userEvent.click(juri)
      await userEvent.click(screen.getByRole('button', { name: 'Save' }))
      expect(saved(server.updateProject)?.contactIds).toEqual(['mari', 'juri'])
    })

    it('projects.contact-added: adds a contact to the customer and ticks it', async () => {
      await show('portal')

      await userEvent.click(contactsSection().getByRole('button', { name: 'Add contact person' }))
      const dialog = within(screen.getByRole('dialog'))
      await userEvent.type(dialog.getByLabelText('Name'), 'Kai Kivi')
      await userEvent.type(dialog.getByLabelText('Email'), 'kai@example.ee')
      await userEvent.click(dialog.getByRole('button', { name: 'Save' }))

      expect(server.addContact.mock.calls[0]?.[0]?.data).toMatchObject({
        organizationId: 'org',
        customerId: 'smin',
        name: 'Kai Kivi',
        email: 'kai@example.ee',
        phone: '',
        noLongerValid: false,
      })
      expect(server.updateProject).not.toHaveBeenCalled()
      await userEvent.click(screen.getByRole('button', { name: 'Save' }))
      const added = server.addContact.mock.calls[0]?.[0]?.data.id
      expect(saved(server.updateProject)?.contactIds).toEqual(['mari', added])
    })

    it('projects.contact-no-longer-valid: marks a contact as no longer valid, with a note', async () => {
      await show('portal')

      await userEvent.click(contactsSection().getByRole('button', { name: 'Edit Mari Mets' }))
      const dialog = within(screen.getByRole('dialog'))
      await userEvent.click(dialog.getByLabelText('Can no longer act as a reference'))
      await userEvent.type(dialog.getByLabelText('Note'), 'Läks pensionile.')
      await userEvent.click(dialog.getByRole('button', { name: 'Save' }))

      expect(server.updateContact.mock.calls[0]?.[0]?.data).toMatchObject({
        contactId: 'mari',
        name: 'Mari Mets',
        noLongerValid: true,
        note: 'Läks pensionile.',
      })
    })

    it('deletes a contact after confirming, and unticks it', async () => {
      await show('portal')

      await userEvent.click(contactsSection().getByRole('button', { name: 'Edit Mari Mets' }))
      await userEvent.click(
        within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }),
      )
      const dialog = within(screen.getByRole('dialog'))
      expect(
        dialog.getByText(/Delete Mari Mets from the customer’s contact persons/),
      ).toBeInTheDocument()
      await userEvent.click(dialog.getByRole('button', { name: 'Delete' }))

      expect(server.deleteContact).toHaveBeenCalledWith({
        data: { organizationId: 'org', contactId: 'mari' },
      })
      await userEvent.click(screen.getByRole('button', { name: 'Save' }))
      expect(saved(server.updateProject)?.contactIds).toEqual([])
    })

    it('closes the contact on Esc at once after Delete and Cancel', async () => {
      await show('portal')

      await userEvent.click(contactsSection().getByRole('button', { name: 'Edit Mari Mets' }))
      await userEvent.click(
        within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }),
      )
      await userEvent.click(
        within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }),
      )
      await userEvent.keyboard('{Escape}')

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('asks before changing the customer drops the contacts', async () => {
      await show('portal')
      const select = screen.getByRole('combobox', { name: 'Customer' })

      await userEvent.selectOptions(select, 'elering')
      expect(screen.getByRole('dialog')).toHaveTextContent(
        'The project’s 1 contact person belongs to the current customer',
      )
      await userEvent.click(
        within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }),
      )
      expect(select).toHaveValue('smin')

      await userEvent.selectOptions(select, 'elering')
      await confirmCustomerChange()
      expect(select).toHaveValue('elering')
      await userEvent.click(screen.getByRole('button', { name: 'Save' }))
      expect(saved(server.updateProject)).toMatchObject({
        customer: { kind: 'existing', id: 'elering' },
        contactIds: [],
      })
    })

    it('needs a stored customer to add contacts', async () => {
      await show(null)

      const add = contactsSection().getByRole('button', { name: 'Add contact person' })
      expect(add).toBeDisabled()
      expect(contactsSection().getByText(/Choose the customer first/)).toBeInTheDocument()

      await userEvent.click(screen.getByRole('button', { name: 'Add customer' }))
      await userEvent.type(within(screen.getByRole('dialog')).getByLabelText('Name'), 'Telia')
      await userEvent.click(
        within(screen.getByRole('dialog')).getByRole('button', { name: 'Save' }),
      )
      expect(contactsSection().getByText(/Save the project first/)).toBeInTheDocument()
      expect(add).toBeDisabled()
    })
  })

  describe('technologies', () => {
    function technologiesSection() {
      return within(screen.getByRole('region', { name: 'Technologies' }))
    }

    it('projects.technology-added-not-copied: picks technologies and saves them with the project', async () => {
      await show('portal')

      const section = technologiesSection()
      expect(section.getByRole('list', { name: 'Technologies' })).toHaveTextContent('React')
      await userEvent.type(section.getByRole('combobox'), 'postgresql')
      await userEvent.click(section.getByRole('option', { name: /PostgreSQL/ }))
      await userEvent.click(section.getByRole('button', { name: 'Remove React' }))
      await userEvent.click(screen.getByRole('button', { name: 'Save' }))

      expect(saved(server.updateProject)?.technologyIds).toEqual(['postgresql'])
    })

    it('projects.extra-technology-adopted: adds a technology participants used', async () => {
      await show('portal')

      const section = technologiesSection()
      await userEvent.click(
        section.getByRole('button', { name: 'Add Angular to the project (participants: 2)' }),
      )
      expect(section.queryByText('Participants also used')).not.toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Save' }))

      expect(saved(server.updateProject)?.technologyIds).toEqual(['react', 'angular'])
      expect(server.addProjectTechnology).not.toHaveBeenCalled()
    })
  })

  describe('solution characteristics', () => {
    function criteriaSection() {
      return within(screen.getByRole('region', { name: 'Solution characteristics' }))
    }

    it('projects.characteristic-answered: answers yes or no with a note', async () => {
      await show('portal')

      const section = criteriaSection()
      const tests = section.getByRole('radiogroup', { name: 'Automated tests' })
      expect(within(tests).getByRole('radio', { name: 'Yes' })).toBeChecked()
      expect(section.getByRole('textbox', { name: 'Note on Automated tests' })).toHaveValue('JUnit')

      const xroad = section.getByRole('radiogroup', { name: 'X-Road' })
      await userEvent.click(within(xroad).getByRole('radio', { name: 'No' }))
      await userEvent.type(section.getByRole('textbox', { name: 'Note on X-Road' }), 'Ei')
      await userEvent.click(screen.getByRole('button', { name: 'Save' }))

      expect(saved(server.updateProject)?.answers).toEqual([
        { criterionId: 'tests', answer: true, note: 'JUnit' },
        { criterionId: 'xroad', answer: false, note: 'Ei' },
      ])
    })

    it('projects.characteristic-unanswered: clearing an answer leaves the characteristic out', async () => {
      await show('portal')

      const tests = criteriaSection().getByRole('radiogroup', { name: 'Automated tests' })
      await userEvent.click(within(tests).getByRole('radio', { name: 'Unanswered' }))
      await userEvent.click(screen.getByRole('button', { name: 'Save' }))

      expect(saved(server.updateProject)?.answers).toEqual([])
    })

    it('a new project starts with every characteristic unanswered', async () => {
      await show(null)

      for (const group of criteriaSection().getAllByRole('radiogroup')) {
        expect(within(group).getByRole('radio', { name: 'Unanswered' })).toBeChecked()
      }
    })
  })
})
