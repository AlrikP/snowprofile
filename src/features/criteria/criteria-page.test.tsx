import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { type Criterion, criteriaQuery } from '#/lib/criteria'
import { CriteriaPage } from './criteria-page'

const server = vi.hoisted(() => ({
  getCriteria: vi.fn(),
  addCriterion: vi.fn(),
  updateCriterion: vi.fn(),
  moveCriterion: vi.fn(),
  removeCriterion: vi.fn(),
}))
vi.mock('#/server/criteria/criteria.functions', () => server)

const checklist: Criterion[] = [
  { id: 'tests', nameEt: 'Automaattestid', nameEn: 'Automated tests', answers: 18 },
  { id: 'xroad', nameEt: 'X-tee', nameEn: null, answers: 1 },
  { id: 'k8s', nameEt: 'Kubernetes', nameEn: 'Kubernetes', answers: 0 },
]

beforeEach(() => {
  vi.clearAllMocks()
  server.getCriteria.mockResolvedValue(checklist)
})

function renderPage(criteria = checklist) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(criteriaQuery('org').queryKey, criteria)
  render(
    <QueryClientProvider client={queryClient}>
      <CriteriaPage organizationId="org" />
    </QueryClientProvider>,
  )
}

describe('CriteriaPage', () => {
  it('lists the characteristics in order, with their answers and missing translations', () => {
    renderPage()

    const items = screen.getAllByRole('listitem')
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('1.Automated tests'),
      expect.stringContaining('2.X-tee'),
      expect.stringContaining('3.Kubernetes'),
    ])
    expect(within(items[0] as HTMLElement).getByText('Answers: 18')).toBeInTheDocument()
    expect(within(items[1] as HTMLElement).getByText('No English')).toBeInTheDocument()
  })

  it('shows the empty state without characteristics', () => {
    renderPage([])

    expect(screen.getByText(/No characteristics yet/)).toBeInTheDocument()
  })

  it('technical-characteristics.admin-adds: adds a characteristic named in one language', async () => {
    server.addCriterion.mockResolvedValue({ id: 'new' })
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Add characteristic' }))
    await userEvent.type(screen.getByLabelText('In Estonian'), 'Pilvetaristu')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(server.addCriterion).toHaveBeenCalledWith({
      data: {
        organizationId: 'org',
        id: expect.any(String),
        name: { et: 'Pilvetaristu', en: null },
      },
    })
    expect(server.getCriteria).toHaveBeenCalled()
  })

  it('technical-characteristics.name-required: the form asks for a name in at least one language', async () => {
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Add characteristic' }))
    await userEvent.type(screen.getByLabelText('In English'), '   ')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(screen.getByLabelText('In Estonian')).toHaveAccessibleDescription(
      expect.stringContaining('Fill in at least one language.'),
    )
    expect(server.addCriterion).not.toHaveBeenCalled()
  })

  it('renames a characteristic, starting from its stored names', async () => {
    server.updateCriterion.mockResolvedValue(undefined)
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Actions for X-tee' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Edit' }))
    expect(screen.getByLabelText('In Estonian')).toHaveValue('X-tee')
    await userEvent.type(screen.getByLabelText('In English'), 'X-Road')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(server.updateCriterion).toHaveBeenCalledWith({
      data: { organizationId: 'org', criterionId: 'xroad', name: { et: 'X-tee', en: 'X-Road' } },
    })
  })

  it('technical-characteristics.admin-reorders: moves a characteristic up', async () => {
    server.moveCriterion.mockResolvedValue(undefined)
    renderPage()

    expect(screen.getByRole('button', { name: 'Move Automated tests up' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Move Kubernetes down' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Move X-tee up' }))

    expect(server.moveCriterion).toHaveBeenCalledWith({
      data: { organizationId: 'org', criterionId: 'xroad', direction: 'up' },
    })
  })

  it('technical-characteristics.removed-answers-hidden: the dialog says how many projects answered', async () => {
    server.removeCriterion.mockResolvedValue(undefined)
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Actions for X-tee' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Remove' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Remove “X-tee”?' }))
    expect(dialog.getByText(/The answers of 1 project are kept/)).toBeInTheDocument()
    await userEvent.click(dialog.getByRole('button', { name: 'Remove' }))

    expect(server.removeCriterion).toHaveBeenCalledWith({
      data: { organizationId: 'org', criterionId: 'xroad' },
    })
  })

  it('says when no project answered the characteristic being removed', async () => {
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Actions for Kubernetes' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Remove' }))

    expect(screen.getByRole('dialog')).toHaveTextContent('No project has answered it.')
  })
})
