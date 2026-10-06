import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Person } from '#/server/profiles/profiles.functions'
import { PeoplePage } from './people-page'
import { peopleQuery } from './people-query'

const server = vi.hoisted(() => ({
  getPeople: vi.fn(),
  requestProfileUpdate: vi.fn(),
  requestUpdateFromAll: vi.fn(),
  cancelUpdateRequest: vi.fn(),
  markLeft: vi.fn(),
}))
vi.mock('#/server/profiles/profiles.functions', () => server)

const now = new Date('2026-10-06T12:00:00Z')

function person(overrides: Partial<Person>): Person {
  return {
    id: 'p1',
    fullName: 'Anna Admin',
    confirmedAt: new Date('2026-08-30T10:00:00Z'),
    leftDate: null,
    participations: 14,
    requestedAt: null,
    you: false,
    canMarkLeft: true,
    ...overrides,
  }
}

const people = [
  person({ id: 'anna', you: true }),
  person({
    id: 'erik',
    fullName: 'Erik Employee',
    confirmedAt: new Date('2026-03-15T10:00:00Z'),
    participations: 3,
    requestedAt: new Date('2026-09-12T10:00:00Z'),
  }),
  person({ id: 'liis', fullName: 'Liis Lepp', confirmedAt: null, participations: 0 }),
  person({ id: 'mart', fullName: 'Mart Mänd', leftDate: '2025-12-31', canMarkLeft: false }),
]

beforeEach(() => {
  vi.clearAllMocks()
  server.getPeople.mockResolvedValue(people)
  for (const fn of [server.requestProfileUpdate, server.cancelUpdateRequest, server.markLeft]) {
    fn.mockResolvedValue(undefined)
  }
  server.requestUpdateFromAll.mockResolvedValue({ requested: 2 })
})

function show() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(peopleQuery('org').queryKey, people)
  render(
    <QueryClientProvider client={queryClient}>
      <PeoplePage organizationId="org" initialNow={now} />
    </QueryClientProvider>,
  )
}

function row(name: RegExp) {
  return screen.getByRole('row', { name })
}

describe('PeoplePage', () => {
  it('profile-update-requests.last-confirmation-shown: shows each person’s last confirmation, request, and participations', () => {
    show()

    expect(row(/Anna Admin/)).toHaveTextContent('30 Aug 2026')
    expect(row(/Anna Admin/)).toHaveTextContent('14')
    expect(row(/Erik Employee/)).toHaveTextContent('Sent 12 Sept 2026')
  })

  it('profile-update-requests.stale-marked: marks confirmations over six months old, and none', () => {
    show()

    expect(within(row(/Erik Employee/)).getAllByText('Over 6 months old').length).toBeGreaterThan(0)
    expect(within(row(/Liis Lepp/)).getAllByText('Never').length).toBeGreaterThan(0)
    expect(within(row(/Liis Lepp/)).queryByText('Over 6 months old')).not.toBeInTheDocument()
    expect(within(row(/Anna Admin/)).queryByText('Over 6 months old')).not.toBeInTheDocument()
  })

  it('members-and-roles.leavers-hidden: hides leavers until asked', async () => {
    show()

    expect(screen.queryByRole('row', { name: /Mart Mänd/ })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Show leavers' }))
    expect(row(/Mart Mänd/)).toHaveTextContent('Left 31 Dec 2025')
  })

  it('profile-update-requests.requested: requests an update from one person, with a message', async () => {
    show()

    await userEvent.click(screen.getByRole('button', { name: 'Actions for Liis Lepp' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Request an update' }))
    const dialog = within(screen.getByRole('dialog'))
    expect(
      dialog.getByText('Liis Lepp sees the request at their next sign-in.'),
    ).toBeInTheDocument()
    await userEvent.type(dialog.getByLabelText('Message (optional)'), 'Lisa projektid.')
    await userEvent.click(dialog.getByRole('button', { name: 'Send request' }))

    expect(server.requestProfileUpdate.mock.calls[0]?.[0]?.data).toMatchObject({
      organizationId: 'org',
      profileId: 'liis',
      message: 'Lisa projektid.',
    })
  })

  it('profile-update-requests.request-all-skips-open: asks everyone without an open request', async () => {
    show()

    await userEvent.click(screen.getByRole('button', { name: 'Request an update from everyone' }))
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByText(/goes to 2 people who don’t have an open request/)).toBeInTheDocument()
    await userEvent.click(dialog.getByRole('button', { name: 'Send request' }))

    expect(server.requestUpdateFromAll).toHaveBeenCalledWith({
      data: { organizationId: 'org', message: '' },
    })
  })

  it('profile-update-requests.canceled: cancels an open request', async () => {
    show()

    await userEvent.click(screen.getByRole('button', { name: 'Actions for Erik Employee' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Cancel request' }))

    expect(server.cancelUpdateRequest).toHaveBeenCalledWith({
      data: { organizationId: 'org', profileId: 'erik' },
    })
  })

  it('members-and-roles.leaver-loses-access: marks a person as left with a date', async () => {
    show()

    await userEvent.click(screen.getByRole('button', { name: 'Actions for Erik Employee' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Mark as left' }))
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByText(/Their access ends now/)).toBeInTheDocument()
    const date = dialog.getByLabelText('Leaving date')
    await userEvent.clear(date)
    await userEvent.type(date, '2026-10-31')
    await userEvent.click(dialog.getByRole('button', { name: 'Mark as left' }))

    expect(server.markLeft).toHaveBeenCalledWith({
      data: { organizationId: 'org', profileId: 'erik', leftDate: '2026-10-31' },
    })
  })
})
