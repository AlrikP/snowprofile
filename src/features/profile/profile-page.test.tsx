import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MyProfile } from '#/server/profiles/profiles.functions'
import { ProfilePage } from './profile-page'
import { myProfileQuery } from './profile-query'

const server = vi.hoisted(() => ({
  getMyProfile: vi.fn(),
  savePersonalDetails: vi.fn(),
  addEducation: vi.fn(),
  updateEducation: vi.fn(),
  deleteEducation: vi.fn(),
}))
vi.mock('#/server/profiles/profiles.functions', () => server)

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
})

function show(data = profile) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(myProfileQuery('org').queryKey, data)
  render(
    <QueryClientProvider client={queryClient}>
      <ProfilePage organizationId="org" />
    </QueryClientProvider>,
  )
}

function section(name: string) {
  return within(screen.getByRole('region', { name }))
}

function sent(mock: typeof server.addEducation) {
  return mock.mock.calls[0]?.[0]?.data
}

describe('ProfilePage', () => {
  it('shows the personal details, with the birth date marked as private', () => {
    show()

    const personal = section('Personal details')
    expect(personal.getByText('Erik Employee')).toBeInTheDocument()
    expect(personal.getByText('1 Mar 2020')).toBeInTheDocument()
    expect(personal.getByText('Not added')).toBeInTheDocument()
    expect(personal.getByText(/Only you and admins see it/)).toBeInTheDocument()
  })

  it('employee-profile.details-saved: saves the edited details, empty dates as none', async () => {
    show()

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
    show()

    await userEvent.click(section('Personal details').getByRole('button', { name: 'Edit' }))
    const dialog = within(screen.getByRole('dialog'))
    await userEvent.clear(dialog.getByLabelText('Name on CVs'))
    await userEvent.click(dialog.getByRole('button', { name: 'Save' }))

    expect(dialog.getByText('Enter your name.')).toBeInTheDocument()
    expect(server.savePersonalDetails).not.toHaveBeenCalled()
  })

  it('lists education with field, degree, and period, and the undated entry as it is', () => {
    show()

    const items = section('Education').getAllByRole('listitem')
    expect(items[0]).toHaveTextContent(
      'Tallinn University of TechnologyInformatics, MSc2012 – 2014',
    )
    expect(items[1]).toHaveTextContent('Coursera')
  })

  it('employee-profile.education-added: adds an entry with only an institution', async () => {
    show()

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
    show()

    await userEvent.click(section('Education').getByRole('button', { name: 'Add' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save' }))

    expect(server.addEducation).not.toHaveBeenCalled()
  })

  it('edits an entry’s period', async () => {
    show()

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
    show()

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

  it('shows a new profile with the account name and nothing else', () => {
    show({ stored: false, fullName: 'Kati Uus', joinDate: null, birthDate: null, education: [] })

    expect(section('Personal details').getByText('Kati Uus')).toBeInTheDocument()
    expect(section('Personal details').getAllByText('Not added')).toHaveLength(2)
    expect(section('Education').getByText('No education added.')).toBeInTheDocument()
  })
})
