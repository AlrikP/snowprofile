import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { AppFrame } from './app-frame'

const demo = {
  id: 'org-demo',
  name: 'Demo Software',
  slug: 'demo',
  role: 'admin',
  updateRequested: false,
}
const rabasaare = {
  id: 'org-rabasaare',
  name: 'Rabasaare Digital',
  slug: 'rabasaare',
  role: 'admin',
  updateRequested: false,
}
const user = { name: 'Anna Admin', email: 'admin@demo.example.com' }

type Props = Omit<ComponentProps<typeof AppFrame>, 'children'>

// The frame's links need a router; this one has no pages, only the frame at a given path.
async function renderFrame(overrides: Partial<Props> = {}, path = '/demo/projects') {
  const props: Props = {
    frame: { user, organizations: [demo, rabasaare], locale: null },
    organization: demo,
    onSwitchOrganization: vi.fn(),
    saveLocale: vi.fn(async () => {}),
    onSignOut: vi.fn(),
    ...overrides,
  }
  const router = createRouter({
    routeTree: createRootRoute({
      component: () => (
        <AppFrame {...props}>
          <main>Page</main>
        </AppFrame>
      ),
    }),
    history: createMemoryHistory({ initialEntries: [path] }),
  })
  await router.load()
  render(<RouterProvider router={router} />)
  return props
}

// The sidebar for wide screens; the phone menu holds a copy only while open.
function sidebar() {
  return within(screen.getByRole('complementary'))
}

describe('AppFrame', () => {
  it('groups an admin’s pages under headings and marks the current one', async () => {
    await renderFrame()

    const work = sidebar().getByRole('navigation', { name: 'Work' })
    expect(
      within(work)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Projects', 'People', 'Search', 'CVs'])
    expect(within(work).getByRole('link', { name: 'Projects' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    const organization = sidebar().getByRole('navigation', { name: 'Organization' })
    expect(within(organization).getAllByRole('link')).toHaveLength(4)
    expect(sidebar().getByRole('link', { name: 'My profile' })).toHaveAttribute(
      'href',
      '/demo/profile',
    )
  })

  it('gives an employee one short list without headings', async () => {
    const employee = { ...demo, role: 'employee' }
    await renderFrame({
      frame: { user, organizations: [employee], locale: null },
      organization: employee,
    })

    expect(
      sidebar()
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['My profile', 'Projects', 'Technologies'])
    expect(sidebar().queryByRole('navigation', { name: 'Work' })).not.toBeInTheDocument()
  })

  it('switches to another organization the user belongs to', async () => {
    const props = await renderFrame()

    await userEvent.click(sidebar().getByRole('button', { name: /Switch organization/ }))
    await userEvent.click(screen.getByRole('menuitemradio', { name: /Rabasaare Digital/ }))

    expect(props.onSwitchOrganization).toHaveBeenCalledWith(rabasaare)
  })

  it('offers no switch to a member of one organization', async () => {
    await renderFrame({ frame: { user, organizations: [demo], locale: null } })

    expect(sidebar().getByText('Demo Software')).toBeInTheDocument()
    expect(sidebar().queryByRole('button', { name: /Switch organization/ })).not.toBeInTheDocument()
  })

  it('signs out from the user menu', async () => {
    const props = await renderFrame()

    await userEvent.click(sidebar().getByRole('button', { name: /User menu/ }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }))

    expect(props.onSignOut).toHaveBeenCalled()
  })

  it('keeps the language and says why when saving it fails', async () => {
    const saveLocale = vi.fn(async () => {
      throw new Error('offline')
    })
    await renderFrame({ saveLocale })

    await userEvent.click(sidebar().getByRole('button', { name: /User menu/ }))
    await userEvent.click(screen.getByRole('menuitemradio', { name: 'Eesti' }))

    expect(saveLocale).toHaveBeenCalledWith('et')
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('profile-update-requests.notice-shown: an open update request shows a notice that leads to the profile', async () => {
    const requested = { ...demo, updateRequested: true }
    await renderFrame({ organization: requested })

    const notice = screen.getByRole('status')
    expect(notice).toHaveTextContent('An admin asked you to review your profile.')
    expect(within(notice).getByRole('link', { name: 'Open my profile' })).toHaveAttribute(
      'href',
      '/demo/profile',
    )
  })

  it('leaves the notice to the profile page itself, and shows none without a request', async () => {
    await renderFrame({ organization: { ...demo, updateRequested: true } }, '/demo/profile')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
