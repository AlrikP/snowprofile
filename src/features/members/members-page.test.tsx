import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PendingInvitation } from '#/server/invitations/invitations.functions'
import type { Member } from '#/server/members/members.functions'
import { MembersPage } from './members-page'
import { invitationsQuery, membersQuery } from './members-query'

const server = vi.hoisted(() => ({
  getMembers: vi.fn(),
  changeMemberRole: vi.fn(),
  getPendingInvitations: vi.fn(),
  createInvitation: vi.fn(),
  cancelInvitation: vi.fn(),
  acceptInvitation: vi.fn(),
}))
vi.mock('#/server/members/members.functions', () => server)
vi.mock('#/server/invitations/invitations.functions', () => server)

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

const invitations: PendingInvitation[] = [
  {
    id: '0192f4c1-7a3e-7b10-9c2d-5e8f1a2b3c4d',
    email: 'mari.maasikas@example.com',
    role: 'employee',
    expiresAt: new Date('2026-10-13T12:00:00Z'),
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  server.getPendingInvitations.mockResolvedValue(invitations)
  server.cancelInvitation.mockResolvedValue(undefined)
  server.createInvitation.mockImplementation(({ data }: { data: { id: string } }) =>
    Promise.resolve({ id: data.id, expiresAt: new Date('2026-10-13T12:00:00Z') }),
  )
  server.getMembers.mockResolvedValue(members)
  server.changeMemberRole.mockResolvedValue(undefined)
})

function show(list = members, { canInvite = true } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(membersQuery('org').queryKey, list)
  queryClient.setQueryData(invitationsQuery('org').queryKey, invitations)
  render(
    <QueryClientProvider client={queryClient}>
      <MembersPage organizationId="org" canInvite={canInvite} />
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

  describe('invitations', () => {
    it('members-and-roles.invite-link: invites an address with a role and shows the link to copy', async () => {
      show()

      await userEvent.click(screen.getByRole('button', { name: 'Invite member' }))
      const dialog = within(screen.getByRole('dialog'))
      await userEvent.type(dialog.getByLabelText('Email'), 'Jaan.Org@Example.com')
      await userEvent.selectOptions(dialog.getByLabelText('Role'), 'admin')
      await userEvent.click(dialog.getByRole('button', { name: 'Create invitation link' }))

      const sent = server.createInvitation.mock.calls[0]?.[0]?.data
      expect(sent).toMatchObject({
        organizationId: 'org',
        email: 'Jaan.Org@Example.com',
        role: 'admin',
      })
      const link = within(screen.getByRole('dialog')).getByLabelText('Invitation link')
      expect(link).toHaveValue(`${window.location.origin}/invite/${sent.id}`)
      expect(screen.getByRole('dialog')).toHaveTextContent(
        'Send this link to jaan.org@example.com.',
      )
      expect(screen.getByRole('dialog')).toHaveTextContent('Expires: 13 Oct 2026')
    })

    it('says when the browser refuses to copy the link', async () => {
      const writeText = vi.fn().mockRejectedValue(new DOMException('Denied', 'NotAllowedError'))
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
      show()

      await userEvent.click(screen.getByRole('button', { name: 'Invite member' }))
      const form = within(screen.getByRole('dialog'))
      await userEvent.type(form.getByLabelText('Email'), 'jaan@example.com')
      await userEvent.click(form.getByRole('button', { name: 'Create invitation link' }))
      await userEvent.click(
        within(screen.getByRole('dialog')).getByRole('button', { name: 'Copy' }),
      )

      expect(writeText).toHaveBeenCalled()
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Couldn’t copy. Select the link and copy it instead.',
      )
    })

    it('asks for an email address', async () => {
      show()

      await userEvent.click(screen.getByRole('button', { name: 'Invite member' }))
      const dialog = within(screen.getByRole('dialog'))
      await userEvent.type(dialog.getByLabelText('Email'), 'not an address')
      await userEvent.click(dialog.getByRole('button', { name: 'Create invitation link' }))

      expect(dialog.getByText('Enter an email address.')).toBeInTheDocument()
      expect(server.createInvitation).not.toHaveBeenCalled()
    })

    it('members-and-roles.invite-member-refused: shows the server’s refusal', async () => {
      const { AppError } = await import('#/server/errors')
      server.createInvitation.mockRejectedValue(new AppError('CONFLICT', 'invitation_member'))
      show()

      await userEvent.click(screen.getByRole('button', { name: 'Invite member' }))
      const dialog = within(screen.getByRole('dialog'))
      await userEvent.type(dialog.getByLabelText('Email'), 'employee@demo.example.com')
      await userEvent.click(dialog.getByRole('button', { name: 'Create invitation link' }))

      expect(await dialog.findByRole('alert')).toHaveTextContent('This person is already a member.')
    })

    it('members-and-roles.invitation-canceled: lists pending invitations with expiry, and cancels one', async () => {
      show()

      const section = within(screen.getByRole('region', { name: 'Pending invitations' }))
      const row = section.getByRole('row', { name: /mari.maasikas/ })
      expect(row).toHaveTextContent('Employee')
      expect(row).toHaveTextContent('13 Oct 2026')
      await userEvent.click(within(row).getByRole('button', { name: 'Cancel invitation' }))

      expect(server.cancelInvitation).toHaveBeenCalledWith({
        data: { organizationId: 'org', invitationId: invitations[0]?.id },
      })
    })

    it('offers no invitations without the permission', () => {
      show(members, { canInvite: false })

      expect(screen.queryByRole('button', { name: 'Invite member' })).not.toBeInTheDocument()
      expect(screen.queryByRole('region', { name: 'Pending invitations' })).not.toBeInTheDocument()
    })
  })
})
