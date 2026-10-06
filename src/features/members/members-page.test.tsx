import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Member } from '#/server/members/members.functions'
import { MembersPage } from './members-page'
import { membersQuery } from './members-query'

const server = vi.hoisted(() => ({ getMembers: vi.fn(), changeMemberRole: vi.fn() }))
vi.mock('#/server/members/members.functions', () => server)

function member(overrides: Partial<Member>): Member {
  return {
    id: 'm1',
    name: 'Anna Admin',
    email: 'admin@demo.example.com',
    role: 'admin',
    joinedAt: new Date('2025-08-29T10:00:00Z'),
    you: false,
    ...overrides,
  }
}

const members = [
  member({ id: 'anna', you: true }),
  member({
    id: 'erik',
    name: 'Erik Employee',
    email: 'employee@demo.example.com',
    role: 'employee',
  }),
]

beforeEach(() => {
  vi.clearAllMocks()
  server.getMembers.mockResolvedValue(members)
  server.changeMemberRole.mockResolvedValue(undefined)
})

function show(list = members) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(membersQuery('org').queryKey, list)
  render(
    <QueryClientProvider client={queryClient}>
      <MembersPage organizationId="org" />
    </QueryClientProvider>,
  )
}

describe('MembersPage', () => {
  it('members-and-roles.admin-lists: lists members with email, role, and join date, marking you', () => {
    show()

    expect(screen.getByText('2 members')).toBeInTheDocument()
    const anna = screen.getByRole('row', { name: /Anna Admin/ })
    expect(within(anna).getByText('you')).toBeInTheDocument()
    expect(anna).toHaveTextContent('admin@demo.example.com')
    expect(anna).toHaveTextContent('Admin')
    expect(anna).toHaveTextContent('29 Aug 2025')
    expect(screen.getByRole('row', { name: /Erik Employee/ })).toHaveTextContent('Employee')
  })

  it('members-and-roles.role-changed: changes a member’s role from the row’s menu', async () => {
    show()

    await userEvent.click(screen.getByRole('button', { name: 'Actions for Erik Employee' }))
    await userEvent.click(screen.getByRole('menuitemradio', { name: 'Admin' }))

    expect(server.changeMemberRole).toHaveBeenCalledWith({
      data: { organizationId: 'org', memberId: 'erik', role: 'admin' },
    })
  })

  it('members-and-roles.last-admin-kept: the last admin’s role can’t be changed, and the menu says why', async () => {
    show()

    await userEvent.click(screen.getByRole('button', { name: 'Actions for Anna Admin' }))

    for (const item of screen.getAllByRole('menuitemradio')) {
      expect(item).toHaveAttribute('aria-disabled', 'true')
    }
    expect(screen.getByText(/needs at least one admin/)).toBeInTheDocument()
    expect(server.changeMemberRole).not.toHaveBeenCalled()
  })

  it('lets an admin step down when another admin remains', async () => {
    show([members[0] as Member, member({ id: 'kalle', name: 'Kalle Kask', role: 'admin' })])

    await userEvent.click(screen.getByRole('button', { name: 'Actions for Anna Admin' }))
    await userEvent.click(screen.getByRole('menuitemradio', { name: 'Employee' }))

    expect(server.changeMemberRole).toHaveBeenCalledWith({
      data: { organizationId: 'org', memberId: 'anna', role: 'employee' },
    })
  })
})
