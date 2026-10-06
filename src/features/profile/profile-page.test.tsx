import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { projectsQuery } from '#/lib/project-list'
import { roleCatalogueQuery } from '#/lib/role-catalogue'
import type { MyProfile, Participation } from '#/server/profiles/profiles.functions'
import type { ProjectListItem } from '#/server/projects/projects.functions'
import { testRoles } from '#/test/role-catalogue'
import { renderPage } from '#/test/router'
import { ProfilePage } from './profile-page'
import { myParticipationsQuery, myProfileQuery } from './profile-query'

const server = vi.hoisted(() => ({
  getMyProfile: vi.fn(),
  savePersonalDetails: vi.fn(),
  addEducation: vi.fn(),
  updateEducation: vi.fn(),
  deleteEducation: vi.fn(),
  getMyParticipations: vi.fn(),
  addParticipation: vi.fn(),
  updateParticipation: vi.fn(),
  deleteParticipation: vi.fn(),
}))
vi.mock('#/server/profiles/profiles.functions', () => server)
vi.mock('#/server/projects/projects.functions', () => ({ getProjects: vi.fn() }))
vi.mock('#/server/roles/roles.functions', () => ({ getRoleCatalogue: vi.fn(), addRole: vi.fn() }))

function project(id: string, name: string, customerName: string | null): ProjectListItem {
  return {
    id,
    name,
    customerName,
    startDate: '2024-03',
    endDate: null,
    descriptionEt: null,
    descriptionEn: null,
    people: 3,
    mine: false,
    technologies: [],
  }
}

const projects = [
  project('portal', 'Kodanikuportaali uuendus', 'Siseministeerium'),
  project('tax', 'e-MTA deklaratsioonid', null),
]

const participations: Participation[] = [
  {
    id: 'pa1',
    projectId: 'portal',
    projectName: 'Kodanikuportaali uuendus',
    customerName: 'Siseministeerium',
    startDate: '2024-05',
    endDate: null,
    hours: { value: 1800, qualifier: 'approximately' },
    tasks: { et: 'Reacti komponendid.', en: 'React components.' },
    roles: [{ id: 'developer', name: { et: 'Arendaja', en: 'Developer' } }],
  },
]

const profile: MyProfile = {
  stored: true,
  fullName: 'Erik Employee',
  joinDate: '2020-03-01',
  birthDate: null,
  education: [
    {
      id: 'ttu',
      institution: { et: 'Tallinna Tehnikaülikool', en: 'Tallinn University of Technology' },
      field: { et: 'Informaatika', en: 'Informatics' },
      degree: { et: 'Magister', en: 'MSc' },
      startDate: '2012',
      endDate: '2014',
    },
    {
      id: 'course',
      institution: { et: null, en: 'Coursera' },
      field: { et: null, en: null },
      degree: { et: null, en: null },
      startDate: null,
      endDate: null,
    },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
  server.getMyProfile.mockResolvedValue(profile)
  server.savePersonalDetails.mockResolvedValue(undefined)
  server.addEducation.mockResolvedValue({ id: 'new' })
  server.updateEducation.mockResolvedValue(undefined)
  server.deleteEducation.mockResolvedValue(undefined)
  server.getMyParticipations.mockResolvedValue(participations)
  server.addParticipation.mockResolvedValue({ id: 'new' })
  server.updateParticipation.mockResolvedValue(undefined)
  server.deleteParticipation.mockResolvedValue(undefined)
})

const closed = vi.fn()

function show(data = profile, { initialParticipation = undefined as string | undefined } = {}) {
  return renderPage(
    <ProfilePage
      organizationId="org"
      organization="demo"
      initialParticipation={initialParticipation}
      onParticipationClosed={closed}
    />,
    [
      [myProfileQuery('org').queryKey, data],
      [myParticipationsQuery('org').queryKey, participations],
      [projectsQuery('org').queryKey, projects],
      [roleCatalogueQuery('org').queryKey, testRoles],
    ],
  )
}

function section(name: string) {
  return within(screen.getByRole('region', { name }))
}

function sent(mock: typeof server.addEducation) {
  return mock.mock.calls[0]?.[0]?.data
}

describe('ProfilePage', () => {
  it('shows the personal details, with the birth date marked as private', async () => {
    await show()

    const personal = section('Personal details')
    expect(personal.getByText('Erik Employee')).toBeInTheDocument()
    expect(personal.getByText('1 Mar 2020')).toBeInTheDocument()
    expect(personal.getByText('Not added')).toBeInTheDocument()
    expect(personal.getByText(/Only you and admins see it/)).toBeInTheDocument()
  })

  it('employee-profile.details-saved: saves the edited details, empty dates as none', async () => {
    await show()

    await userEvent.click(section('Personal details').getByRole('button', { name: 'Edit' }))
    const dialog = within(screen.getByRole('dialog'))
    await userEvent.clear(dialog.getByLabelText('Name on CVs'))
    await userEvent.type(dialog.getByLabelText('Name on CVs'), 'Erik Töötaja')
    await userEvent.clear(dialog.getByLabelText('Joined the company'))
    await userEvent.type(dialog.getByLabelText('Date of birth'), '1990-06-14')
    await userEvent.click(dialog.getByRole('button', { name: 'Save' }))

    expect(sent(server.savePersonalDetails)).toEqual({
      organizationId: 'org',
      fullName: 'Erik Töötaja',
      joinDate: null,
      birthDate: '1990-06-14',
    })
  })

  it('asks for a name', async () => {
    await show()

    await userEvent.click(section('Personal details').getByRole('button', { name: 'Edit' }))
    const dialog = within(screen.getByRole('dialog'))
    await userEvent.clear(dialog.getByLabelText('Name on CVs'))
    await userEvent.click(dialog.getByRole('button', { name: 'Save' }))

    expect(dialog.getByText('Enter your name.')).toBeInTheDocument()
    expect(server.savePersonalDetails).not.toHaveBeenCalled()
  })

  it('lists education with field, degree, and period, and the undated entry as it is', async () => {
    await show()

    const items = section('Education').getAllByRole('listitem')
    expect(items[0]).toHaveTextContent(
      'Tallinn University of TechnologyInformatics, MSc2012 – 2014',
    )
    expect(items[1]).toHaveTextContent('Coursera')
  })

  it('employee-profile.education-added: adds an entry with only an institution', async () => {
    await show()

    await userEvent.click(section('Education').getByRole('button', { name: 'Add' }))
    const dialog = within(screen.getByRole('dialog'))
    const institution = within(dialog.getByRole('group', { name: 'Institution' }))
    await userEvent.type(institution.getByLabelText('In Estonian'), 'Tartu Ülikool')
    await userEvent.click(dialog.getByRole('button', { name: 'Save' }))

    expect(sent(server.addEducation)).toMatchObject({
      organizationId: 'org',
      institution: { et: 'Tartu Ülikool', en: null },
      field: { et: null, en: null },
      degree: { et: null, en: null },
      period: { startDate: null, endDate: null },
    })
  })

  it('asks for an institution in either language', async () => {
    await show()

    await userEvent.click(section('Education').getByRole('button', { name: 'Add' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save' }))

    expect(server.addEducation).not.toHaveBeenCalled()
  })

  it('edits an entry’s period', async () => {
    await show()

    await userEvent.click(
      section('Education').getByRole('button', { name: 'Edit Tallinn University of Technology' }),
    )
    const dialog = within(screen.getByRole('dialog'))
    const end = within(dialog.getByRole('group', { name: 'End' }))
    await userEvent.selectOptions(end.getByLabelText('Month'), '6')
    await userEvent.click(dialog.getByRole('button', { name: 'Save' }))

    expect(sent(server.updateEducation)).toMatchObject({
      educationId: 'ttu',
      period: { startDate: '2012', endDate: '2014-06' },
    })
  })

  it('employee-profile.education-deleted: deletes an entry after confirming', async () => {
    await show()

    await userEvent.click(section('Education').getByRole('button', { name: 'Edit Coursera' }))
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }),
    )
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByText('Delete Coursera from your education?')).toBeInTheDocument()
    await userEvent.click(dialog.getByRole('button', { name: 'Delete' }))

    expect(server.deleteEducation).toHaveBeenCalledWith({
      data: { organizationId: 'org', educationId: 'course' },
    })
  })

  it('shows a new profile with the account name and nothing else', async () => {
    await show({
      stored: false,
      fullName: 'Kati Uus',
      joinDate: null,
      birthDate: null,
      education: [],
    })

    expect(section('Personal details').getByText('Kati Uus')).toBeInTheDocument()
    expect(section('Personal details').getAllByText('Not added')).toHaveLength(2)
    expect(section('Education').getByText('No education added.')).toBeInTheDocument()
  })

  describe('participations', () => {
    function participationsSection() {
      return section('Project participations')
    }

    it('lists each participation with project, customer, roles, period, hours, and tasks', async () => {
      await show()

      const item = participationsSection().getAllByRole('listitem')[0]
      expect(item).toHaveTextContent(
        'Kodanikuportaali uuendusSiseministeeriumDeveloper · 05-2024 – ongoing · approximately 1,800 hReact components.',
      )
      expect(
        within(item as HTMLElement).getByRole('link', { name: 'Kodanikuportaali uuendus' }),
      ).toHaveAttribute('href', '/demo/projects/portal')
    })

    it('project-participation.added: adds a participation with a project, period, roles, hours, and tasks', async () => {
      await show()

      await userEvent.click(
        participationsSection().getByRole('button', { name: 'Add participation' }),
      )
      const dialog = within(screen.getByRole('dialog'))
      await userEvent.selectOptions(dialog.getByLabelText('Project'), 'tax')
      const start = within(dialog.getByRole('group', { name: 'Start' }))
      await userEvent.selectOptions(start.getByLabelText('Month'), '5')
      await userEvent.type(start.getByLabelText('Year'), '2021')
      const end = within(dialog.getByRole('group', { name: 'End' }))
      await userEvent.selectOptions(end.getByLabelText('Month'), '12')
      await userEvent.type(end.getByLabelText('Year'), '2023')
      await userEvent.type(dialog.getByRole('combobox', { name: 'Add a role' }), 'analüü')
      await userEvent.click(dialog.getByRole('option', { name: /^Analyst/ }))
      await userEvent.type(dialog.getByRole('textbox', { name: 'Your hours' }), '3000')
      const tasks = within(dialog.getByRole('group', { name: 'What you did' }))
      await userEvent.type(tasks.getByLabelText('In English'), 'Declaration forms.')
      await userEvent.click(dialog.getByRole('button', { name: 'Save' }))

      expect(sent(server.addParticipation)).toMatchObject({
        organizationId: 'org',
        projectId: 'tax',
        period: { startDate: '2021-05', endDate: '2023-12' },
        roleIds: ['analyst'],
        hours: { value: 3000, qualifier: 'approximately' },
        tasks: { et: null, en: 'Declaration forms.' },
      })
    })

    it('asks for a project and a role', async () => {
      await show()

      await userEvent.click(
        participationsSection().getByRole('button', { name: 'Add participation' }),
      )
      const dialog = within(screen.getByRole('dialog'))
      await userEvent.click(dialog.getByRole('button', { name: 'Save' }))

      expect(dialog.getByText('Choose the project.')).toBeInTheDocument()
      expect(dialog.getByText('Add at least one role.')).toBeInTheDocument()
      expect(server.addParticipation).not.toHaveBeenCalled()
    })

    it('project-participation.several-roles: keeps several roles', async () => {
      await show()

      await userEvent.click(
        participationsSection().getByRole('button', { name: 'Edit Kodanikuportaali uuendus' }),
      )
      const dialog = within(screen.getByRole('dialog'))
      await userEvent.type(dialog.getByRole('combobox', { name: 'Add a role' }), 'analüü')
      await userEvent.click(dialog.getByRole('option', { name: /^Analyst/ }))
      await userEvent.click(dialog.getByRole('button', { name: 'Save' }))

      expect(sent(server.updateParticipation)).toMatchObject({
        participationId: 'pa1',
        roleIds: ['developer', 'analyst'],
      })
    })

    it('project-participation.ongoing-clears-end: saving with Ongoing ticked clears the end', async () => {
      await show()

      await userEvent.click(
        participationsSection().getByRole('button', { name: 'Edit Kodanikuportaali uuendus' }),
      )
      const dialog = within(screen.getByRole('dialog'))
      const ongoing = dialog.getByRole('checkbox', { name: 'Ongoing' })
      await userEvent.click(ongoing)
      await userEvent.type(
        within(dialog.getByRole('group', { name: 'End' })).getByLabelText('Year'),
        '2025',
      )
      await userEvent.click(ongoing)
      await userEvent.click(dialog.getByRole('button', { name: 'Save' }))

      expect(sent(server.updateParticipation)?.period).toEqual({
        startDate: '2024-05',
        endDate: null,
      })
    })

    it('project-participation.end-before-start-refused: an end before the start is not saved', async () => {
      await show()

      await userEvent.click(
        participationsSection().getByRole('button', { name: 'Edit Kodanikuportaali uuendus' }),
      )
      const dialog = within(screen.getByRole('dialog'))
      await userEvent.click(dialog.getByRole('checkbox', { name: 'Ongoing' }))
      await userEvent.type(
        within(dialog.getByRole('group', { name: 'End' })).getByLabelText('Year'),
        '2023',
      )
      await userEvent.click(dialog.getByRole('button', { name: 'Save' }))

      expect(dialog.getByText('The end can’t be before the start.')).toBeInTheDocument()
      expect(server.updateParticipation).not.toHaveBeenCalled()
    })

    it('opens the participation a project page links to, and says when it closes', async () => {
      await show(profile, { initialParticipation: 'pa1' })

      const dialog = within(screen.getByRole('dialog'))
      expect(dialog.getByLabelText('Project')).toHaveValue('portal')
      await userEvent.click(dialog.getByRole('button', { name: 'Cancel' }))
      expect(closed).toHaveBeenCalled()
    })

    it('deletes a participation after confirming', async () => {
      await show()

      await userEvent.click(
        participationsSection().getByRole('button', { name: 'Edit Kodanikuportaali uuendus' }),
      )
      await userEvent.click(
        within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }),
      )
      const dialog = within(screen.getByRole('dialog'))
      expect(
        dialog.getByText(/Delete your participation in Kodanikuportaali uuendus/),
      ).toBeInTheDocument()
      await userEvent.click(dialog.getByRole('button', { name: 'Delete' }))

      expect(server.deleteParticipation).toHaveBeenCalledWith({
        data: { organizationId: 'org', participationId: 'pa1' },
      })
    })
  })
})
