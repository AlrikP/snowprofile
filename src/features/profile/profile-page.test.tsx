import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { projectsQuery } from '#/lib/project-list'
import { roleCatalogueQuery } from '#/lib/role-catalogue'
import { technologyCatalogueQuery } from '#/lib/technology-catalogue'
import type { MyProfile, OwnProject, Participation } from '#/server/profiles/profiles.functions'
import type { ProjectListItem } from '#/server/projects/projects.functions'
import { testRoles } from '#/test/role-catalogue'
import { renderPage } from '#/test/router'
import { testCatalogue } from '#/test/technology-catalogue'
import { ProfilePage } from './profile-page'
import { myOwnProjectsQuery, myParticipationsQuery, myProfileQuery } from './profile-query'

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
  getMyOwnProjects: vi.fn(),
  addOwnProject: vi.fn(),
  updateOwnProject: vi.fn(),
  deleteOwnProject: vi.fn(),
  confirmProfile: vi.fn(),
}))
vi.mock('#/server/profiles/profiles.functions', () => server)
vi.mock('#/server/projects/projects.functions', () => ({ getProjects: vi.fn() }))
const roles = vi.hoisted(() => ({ getRoleCatalogue: vi.fn(), addRole: vi.fn() }))
vi.mock('#/server/roles/roles.functions', () => roles)
const technologies = vi.hoisted(() => ({
  getTechnologyCatalogue: vi.fn(),
  addTechnology: vi.fn(),
}))
vi.mock('#/server/technologies/technologies.functions', () => technologies)

function project(
  id: string,
  name: string,
  customerName: string | null,
  technologies: ProjectListItem['technologies'] = [],
  period: Pick<ProjectListItem, 'startDate' | 'endDate'> = { startDate: '2024-03', endDate: null },
): ProjectListItem {
  return {
    id,
    name,
    customerName,
    ...period,
    people: 3,
    mine: false,
    technologies,
  }
}

const projects = [
  project('portal', 'Kodanikuportaali uuendus', 'Siseministeerium', [
    { id: 'react', name: 'React' },
    { id: 'postgresql', name: 'PostgreSQL' },
  ]),
  project(
    'tax',
    'e-MTA deklaratsioonid',
    null,
    [
      { id: 'angular', name: 'Angular' },
      { id: 'postgres', name: 'Postgres' },
    ],
    { startDate: '2021-03', endDate: '2025-06' },
  ),
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
    technologies: [{ id: 'react', name: 'React' }],
  },
]

const profile: MyProfile = {
  stored: true,
  confirmedAt: new Date('2026-03-15T10:00:00Z'),
  openRequest: null,
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
  server.getMyOwnProjects.mockResolvedValue(ownProjects)
  server.addOwnProject.mockResolvedValue({ id: 'new' })
  server.updateOwnProject.mockResolvedValue(undefined)
  server.deleteOwnProject.mockResolvedValue(undefined)
  server.confirmProfile.mockResolvedValue({ confirmedAt: new Date() })
})

const ownProjects: OwnProject[] = [
  {
    id: 'own1',
    name: 'Kliendiportaal',
    employer: 'Nortal',
    customerName: 'Elisa Eesti',
    description: { et: 'Tellimuste vaated.', en: 'Order views.' },
    startDate: '2016',
    endDate: '2019',
    hours: null,
    tasks: { et: null, en: null },
    totalHours: null,
    cost: { value: 90000, qualifier: 'approximately' },
    tenderReference: null,
    roles: [{ id: 'developer', name: { et: 'Arendaja', en: 'Developer' } }],
    technologies: [{ id: 'angular', name: 'Angular' }],
  },
]

const closed = vi.fn()

function show(
  data = profile,
  { initialParticipation = undefined as string | undefined, work = participations } = {},
) {
  return renderPage(
    <ProfilePage
      organizationId="org"
      organization="demo"
      initialParticipation={initialParticipation}
      onParticipationClosed={closed}
    />,
    [
      [myProfileQuery('org').queryKey, data],
      [myParticipationsQuery('org').queryKey, work],
      [myOwnProjectsQuery('org').queryKey, ownProjects],
      [projectsQuery('org').queryKey, projects],
      [roleCatalogueQuery('org').queryKey, testRoles],
      [technologyCatalogueQuery('org').queryKey, testCatalogue],
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
      confirmedAt: null,
      openRequest: null,
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
        'Kodanikuportaali uuendusSiseministeeriumDeveloper · 05-2024 – ongoing · approximately 1,800 hReact components.React',
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
        technologyIds: ['angular', 'postgres'],
      })
    })

    it('project-participation.project-period-shown: shows the chosen project’s period', async () => {
      await show()

      await userEvent.click(
        participationsSection().getByRole('button', { name: 'Add participation' }),
      )
      const dialog = within(screen.getByRole('dialog'))
      expect(dialog.queryByText(/^Project period/)).not.toBeInTheDocument()
      await userEvent.selectOptions(dialog.getByLabelText('Project'), 'tax')
      expect(dialog.getByLabelText('Project')).toHaveAccessibleDescription(
        'Project period: 03-2021 – 06-2025',
      )
      await userEvent.selectOptions(dialog.getByLabelText('Project'), 'portal')
      expect(dialog.getByLabelText('Project')).toHaveAccessibleDescription(
        'Project period: 03-2024 – ongoing',
      )
    })

    it('shows the project’s period when editing a participation', async () => {
      await show()

      await userEvent.click(
        participationsSection().getByRole('button', { name: 'Edit Kodanikuportaali uuendus' }),
      )
      const dialog = within(screen.getByRole('dialog'))
      expect(dialog.getByText('Project period: 03-2024 – ongoing')).toBeInTheDocument()
    })

    async function addOnTax(from: [string, string], until: [string, string]) {
      await show()
      await userEvent.click(
        participationsSection().getByRole('button', { name: 'Add participation' }),
      )
      const dialog = within(screen.getByRole('dialog'))
      await userEvent.selectOptions(dialog.getByLabelText('Project'), 'tax')
      const start = within(dialog.getByRole('group', { name: 'Start' }))
      await userEvent.selectOptions(start.getByLabelText('Month'), from[0])
      await userEvent.type(start.getByLabelText('Year'), from[1])
      const end = within(dialog.getByRole('group', { name: 'End' }))
      await userEvent.selectOptions(end.getByLabelText('Month'), until[0])
      await userEvent.type(end.getByLabelText('Year'), until[1])
      await userEvent.type(dialog.getByRole('combobox', { name: 'Add a role' }), 'arend')
      await userEvent.click(dialog.getByRole('option', { name: /^Developer/ }))
      await userEvent.click(dialog.getByRole('button', { name: 'Save' }))
      return dialog
    }

    it('project-participation.before-project-start-refused: the form refuses a start before the project’s', async () => {
      const dialog = await addOnTax(['1', '2021'], ['12', '2023'])

      expect(dialog.getByText('Can’t be before the project’s start.')).toBeInTheDocument()
      expect(server.addParticipation).not.toHaveBeenCalled()
    })

    it('project-participation.after-project-end-refused: the form refuses an end after the project’s, or ongoing', async () => {
      const dialog = await addOnTax(['5', '2021'], ['9', '2025'])

      expect(dialog.getByText('Can’t be after the project’s end.')).toBeInTheDocument()
      await userEvent.click(dialog.getByLabelText('Ongoing'))
      expect(
        dialog.getByText('The project has ended, so enter when you finished.'),
      ).toBeInTheDocument()
      expect(server.addParticipation).not.toHaveBeenCalled()
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

    it('project-participation.project-kept: the edit form shows the project without letting it change', async () => {
      await show()

      await userEvent.click(
        participationsSection().getByRole('button', { name: 'Edit Kodanikuportaali uuendus' }),
      )
      const dialog = within(screen.getByRole('dialog'))
      const select = dialog.getByLabelText('Project')
      expect(select).toHaveValue('portal')
      expect(select).toBeDisabled()
      expect(select).toHaveAccessibleDescription(
        'Project period: 03-2024 – ongoing The project can’t be changed. For another project, delete this participation and add a new one.',
      )
      await userEvent.click(dialog.getByRole('button', { name: 'Save' }))

      expect(sent(server.updateParticipation)).not.toHaveProperty('projectId')
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

    it('project-participation.ongoing-ends-with-project: the edit form opens with the project’s end', async () => {
      // The read gives the end the profile shows: the project's, though none is stored.
      const endedWithProject: Participation = {
        ...participations[0],
        id: 'pa2',
        projectId: 'tax',
        projectName: 'e-MTA deklaratsioonid',
        customerName: null,
        startDate: '2022-01',
        endDate: '2025-06',
      }
      await show(profile, { work: [endedWithProject] })

      await userEvent.click(
        participationsSection().getByRole('button', { name: 'Edit e-MTA deklaratsioonid' }),
      )
      const dialog = within(screen.getByRole('dialog'))
      expect(dialog.getByRole('checkbox', { name: 'Ongoing' })).not.toBeChecked()
      const end = within(dialog.getByRole('group', { name: 'End' }))
      expect(end.getByLabelText('Month')).toHaveValue('6')
      expect(end.getByLabelText('Year')).toHaveValue('2025')
      await userEvent.click(dialog.getByRole('button', { name: 'Save' }))

      expect(sent(server.updateParticipation)?.period).toEqual({
        startDate: '2022-01',
        endDate: '2025-06',
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

    it('project-participation.technologies-prefilled: a new participation starts with the project’s technologies', async () => {
      await show()

      await userEvent.click(
        participationsSection().getByRole('button', { name: 'Add participation' }),
      )
      const dialog = within(screen.getByRole('dialog'))
      await userEvent.selectOptions(dialog.getByLabelText('Project'), 'tax')
      const chosen = dialog.getByRole('list', { name: 'Technologies used' })
      expect(chosen).toHaveTextContent('AngularPostgres')
      await userEvent.click(dialog.getByRole('button', { name: 'Remove Postgres' }))
      await userEvent.type(
        dialog.getByRole('combobox', { name: 'Add a technology from the catalogue' }),
        'react',
      )
      await userEvent.click(dialog.getByRole('option', { name: /React/ }))
      await userEvent.type(
        within(dialog.getByRole('group', { name: 'Start' })).getByLabelText('Year'),
        '2021',
      )
      await userEvent.type(
        within(dialog.getByRole('group', { name: 'End' })).getByLabelText('Year'),
        '2023',
      )
      await userEvent.type(dialog.getByRole('combobox', { name: 'Add a role' }), 'arend')
      await userEvent.click(dialog.getByRole('option', { name: /^Developer/ }))
      await userEvent.click(dialog.getByRole('button', { name: 'Save' }))

      expect(sent(server.addParticipation)?.technologyIds).toEqual(['angular', 'react'])
    })

    it('project-participation.project-technologies-suggested: editing offers the project’s technologies the list lacks', async () => {
      await show()

      await userEvent.click(
        participationsSection().getByRole('button', { name: 'Edit Kodanikuportaali uuendus' }),
      )
      const dialog = within(screen.getByRole('dialog'))
      const suggested = within(dialog.getByRole('group', { name: 'Also on the project:' }))
      expect(suggested.getAllByRole('button').map((each) => each.textContent)).toEqual([
        'PostgreSQL',
      ])
      await userEvent.click(
        suggested.getByRole('button', { name: 'Add PostgreSQL, which the project lists' }),
      )
      expect(dialog.queryByRole('group', { name: 'Also on the project:' })).not.toBeInTheDocument()
      await userEvent.click(dialog.getByRole('button', { name: 'Save' }))

      expect(sent(server.updateParticipation)?.technologyIds).toEqual(['react', 'postgresql'])
    })

    it('project-participation.own-copy: changing a saved participation’s project keeps its list', async () => {
      await show()

      await userEvent.click(
        participationsSection().getByRole('button', { name: 'Edit Kodanikuportaali uuendus' }),
      )
      const dialog = within(screen.getByRole('dialog'))
      await userEvent.selectOptions(dialog.getByLabelText('Project'), 'tax')

      expect(dialog.getByRole('list', { name: 'Technologies used' })).toHaveTextContent('React')
      expect(dialog.getByRole('list', { name: 'Technologies used' })).not.toHaveTextContent(
        'Angular',
      )
    })
  })

  describe('own projects', () => {
    function ownSection() {
      return section('Own projects')
    }

    it('lists each own project with employer, customer, roles, period, and technologies', async () => {
      await show()

      expect(ownSection().getAllByRole('listitem')[0]).toHaveTextContent(
        'KliendiportaalEmployer: NortalElisa EestiDeveloper · 2016 – 2019Order views.Angular',
      )
    })

    it('own-projects.added: adds an own project with its fields and the optional details', async () => {
      await show()

      await userEvent.click(ownSection().getByRole('button', { name: 'Add own project' }))
      const dialog = within(screen.getByRole('dialog'))
      await userEvent.type(dialog.getByLabelText('Project name'), 'Väikesed veebilahendused')
      await userEvent.type(dialog.getByLabelText('Employer'), 'Oma firma OÜ')
      await userEvent.type(dialog.getByLabelText('Customer'), 'Erinevad kliendid')
      await userEvent.type(
        within(dialog.getByRole('group', { name: 'Start' })).getByLabelText('Year'),
        '2019',
      )
      await userEvent.type(dialog.getByRole('combobox', { name: 'Add a role' }), 'arend')
      await userEvent.click(dialog.getByRole('option', { name: /^Developer/ }))
      await userEvent.type(
        dialog.getByRole('combobox', { name: 'Add a technology from the catalogue' }),
        'react',
      )
      await userEvent.click(dialog.getByRole('option', { name: /React/ }))
      await userEvent.click(dialog.getByText('Project details'))
      await userEvent.type(dialog.getByLabelText('Tender reference number'), 'RHR-1')
      await userEvent.type(dialog.getByRole('textbox', { name: 'Cost' }), '12000')
      await userEvent.click(dialog.getByRole('button', { name: 'Save' }))

      expect(sent(server.addOwnProject)).toMatchObject({
        organizationId: 'org',
        name: 'Väikesed veebilahendused',
        employer: 'Oma firma OÜ',
        customerName: 'Erinevad kliendid',
        period: { startDate: '2019', endDate: null },
        roleIds: ['developer'],
        technologyIds: ['react'],
        tenderReference: 'RHR-1',
        cost: { value: 12000, qualifier: 'approximately' },
        totalHours: null,
      })
    })

    // The add dialogs render in portals, but React passes their submit up to the own
    // project form the picker sits in.
    async function startOwnProject() {
      await show()
      await userEvent.click(ownSection().getByRole('button', { name: 'Add own project' }))
      const own = within(screen.getByRole('dialog'))
      await userEvent.type(own.getByLabelText('Project name'), 'Väikesed veebilahendused')
      await userEvent.type(
        within(own.getByRole('group', { name: 'Start' })).getByLabelText('Year'),
        '2019',
      )
      return own
    }

    function added(mock: typeof technologies.addTechnology) {
      mock.mockImplementation(({ data }: { data: { id: string } }) =>
        Promise.resolve({ id: data.id }),
      )
      return () => mock.mock.calls[0]?.[0]?.data?.id as string
    }

    it('adding a technology from the picker keeps the own project open and picks it', async () => {
      const newId = added(technologies.addTechnology)
      technologies.getTechnologyCatalogue.mockImplementation(() =>
        Promise.resolve({
          ...testCatalogue,
          technologies: [
            ...testCatalogue.technologies,
            { id: newId(), name: 'Svelte', categoryId: 'frontend', projects: 0, people: 0 },
          ],
        }),
      )
      const own = await startOwnProject()
      await userEvent.type(own.getByRole('combobox', { name: 'Add a role' }), 'arend')
      await userEvent.click(own.getByRole('option', { name: /^Developer/ }))
      await userEvent.type(
        own.getByRole('combobox', { name: 'Add a technology from the catalogue' }),
        'Svelte',
      )
      await userEvent.click(own.getByRole('option', { name: 'Add to the catalogue: Svelte' }))
      const add = within(screen.getByRole('dialog', { name: 'Add technology' }))
      await userEvent.click(add.getByRole('button', { name: 'Save' }))

      expect(await own.findByRole('button', { name: 'Remove Svelte' })).toBeInTheDocument()
      expect(technologies.addTechnology).toHaveBeenCalledOnce()
      expect(server.addOwnProject).not.toHaveBeenCalled()
    })

    it('adding a role from the picker keeps the own project open and picks it', async () => {
      const newId = added(roles.addRole)
      roles.getRoleCatalogue.mockImplementation(() =>
        Promise.resolve([
          ...testRoles,
          { id: newId(), nameEt: 'Testija', nameEn: 'Tester', uses: 0 },
        ]),
      )
      const own = await startOwnProject()
      // Without a name, a submit reaching the own project form would show its error.
      await userEvent.clear(own.getByLabelText('Project name'))
      await userEvent.type(own.getByRole('combobox', { name: 'Add a role' }), 'Tester')
      await userEvent.click(own.getByRole('option', { name: 'Add a new role: Tester' }))
      const add = within(screen.getByRole('dialog', { name: 'New role' }))
      await userEvent.type(add.getByLabelText('In Estonian'), 'Testija')
      await userEvent.click(add.getByRole('button', { name: 'Save' }))

      expect(await own.findByRole('button', { name: 'Remove Tester' })).toBeInTheDocument()
      expect(own.queryByText('Enter the project’s name.')).not.toBeInTheDocument()
      expect(roles.addRole).toHaveBeenCalledOnce()
      expect(server.addOwnProject).not.toHaveBeenCalled()
    })

    it('own-projects.roles-from-catalogue: needs a role from the catalogue and a name', async () => {
      await show()

      await userEvent.click(ownSection().getByRole('button', { name: 'Add own project' }))
      const dialog = within(screen.getByRole('dialog'))
      await userEvent.click(dialog.getByRole('button', { name: 'Save' }))

      expect(dialog.getByText('Enter the project’s name.')).toBeInTheDocument()
      expect(dialog.getByText('Add at least one role.')).toBeInTheDocument()
      expect(dialog.getByRole('combobox', { name: 'Add a role' })).toBeInTheDocument()
      expect(server.addOwnProject).not.toHaveBeenCalled()
    })

    it('own-projects.ongoing-clears-end: saving with Ongoing ticked clears the end', async () => {
      await show()

      await userEvent.click(ownSection().getByRole('button', { name: 'Edit Kliendiportaal' }))
      const dialog = within(screen.getByRole('dialog'))
      await userEvent.click(dialog.getByRole('checkbox', { name: 'Ongoing' }))
      await userEvent.click(dialog.getByRole('button', { name: 'Save' }))

      expect(sent(server.updateOwnProject)).toMatchObject({
        ownProjectId: 'own1',
        period: { startDate: '2016', endDate: null },
        cost: { value: 90000, qualifier: 'approximately' },
      })
    })

    it('deletes an own project after confirming', async () => {
      await show()

      await userEvent.click(ownSection().getByRole('button', { name: 'Edit Kliendiportaal' }))
      await userEvent.click(
        within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }),
      )
      await userEvent.click(
        within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }),
      )

      expect(server.deleteOwnProject).toHaveBeenCalledWith({
        data: { organizationId: 'org', ownProjectId: 'own1' },
      })
    })
  })

  it('closes on Esc at once after Delete and Cancel, with nothing changed', async () => {
    await show()

    for (const [name, edit] of [
      ['Education', 'Edit Coursera'],
      ['Project participations', 'Edit Kodanikuportaali uuendus'],
      ['Own projects', 'Edit Kliendiportaal'],
    ]) {
      await userEvent.click(section(name).getByRole('button', { name: edit }))
      await userEvent.click(
        within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }),
      )
      await userEvent.click(
        within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }),
      )
      await userEvent.keyboard('{Escape}')

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    }
  })

  describe('confirmation', () => {
    it('profile-update-requests.confirmed-without-request: shows the last confirmation and confirms without a request', async () => {
      await show()

      expect(screen.getByText('Last confirmed: 15 Mar 2026')).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Profile is up to date' }))

      expect(server.confirmProfile).toHaveBeenCalledWith({ data: { organizationId: 'org' } })
      expect(await screen.findByText('Thanks! Your profile is confirmed.')).toBeInTheDocument()
    })

    it('says when the profile was never confirmed', async () => {
      await show({ ...profile, confirmedAt: null })

      expect(screen.getByText('Not confirmed yet')).toBeInTheDocument()
    })

    it('profile-update-requests.notice-shown: shows the open request with who asked, when, and the message', async () => {
      await show({
        ...profile,
        openRequest: {
          message: 'Lisa 2026. aasta projektid.',
          requestedAt: new Date('2026-09-12T10:00:00Z'),
          requestedBy: 'Kalle Kask',
        },
      })

      const notice = screen.getByRole('status')
      expect(notice).toHaveTextContent('Please review your profile')
      expect(notice).toHaveTextContent(
        'Kalle Kask asked on 12 Sept 2026: “Lisa 2026. aasta projektid.”',
      )
      await userEvent.click(within(notice).getByRole('button', { name: 'Profile is up to date' }))
      expect(server.confirmProfile).toHaveBeenCalled()
    })
  })
})
