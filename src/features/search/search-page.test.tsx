import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { type Criterion, criteriaQuery } from '#/lib/criteria'
import { roleCatalogueQuery } from '#/lib/role-catalogue'
import type { SearchFilters } from '#/lib/search-filters'
import { technologyCatalogueQuery } from '#/lib/technology-catalogue'
import type { SearchResult } from '#/server/search/search.functions'
import { testRoles } from '#/test/role-catalogue'
import { renderPage } from '#/test/router'
import { testCatalogue } from '#/test/technology-catalogue'
import { SearchPage } from './search-page'
import { searchQuery } from './search-query'

const server = vi.hoisted(() => ({ searchPeople: vi.fn() }))
vi.mock('#/server/search/search.functions', () => server)
vi.mock('#/server/criteria/criteria.functions', () => ({ getCriteria: vi.fn() }))
vi.mock('#/server/roles/roles.functions', () => ({ getRoleCatalogue: vi.fn(), addRole: vi.fn() }))
vi.mock('#/server/technologies/technologies.functions', () => ({
  getTechnologyCatalogue: vi.fn(),
  addTechnology: vi.fn(),
}))

const checklist: Criterion[] = [
  { id: 'xroad', nameEt: 'X-tee', nameEn: 'X-Road', answers: 3 },
  { id: 'k8s', nameEt: 'Kubernetes', nameEn: null, answers: 1 },
]

const results: SearchResult[] = [
  {
    id: 'erik',
    fullName: 'Erik Employee',
    leftDate: null,
    items: [
      {
        id: 'pa1',
        kind: 'participation',
        projectId: 'tax',
        name: 'e-MTA deklaratsioonid',
        customerName: 'Maksu- ja Tolliamet',
        employer: null,
        startDate: '2021-05',
        endDate: '2023-12',
        roles: [
          { id: 'developer', name: { et: 'Arendaja', en: 'Developer' }, matched: false },
          { id: 'analyst', name: { et: 'Analüütik', en: 'Analyst' }, matched: true },
        ],
        technologies: [
          { id: 'react', name: 'React', matched: true },
          { id: 'angular', name: 'Angular', matched: false },
        ],
        criteria: [],
      },
      {
        id: 'own1',
        kind: 'own',
        projectId: null,
        name: 'Riigiportaali liidesed',
        customerName: null,
        employer: 'Nortal',
        startDate: '2016',
        endDate: '2019',
        roles: [],
        technologies: [{ id: 'react', name: 'React', matched: true }],
        criteria: [],
      },
    ],
  },
  {
    id: 'tonu',
    fullName: 'Tõnu Tamm',
    leftDate: '2025-12-31',
    items: [],
  },
]

const onFiltersChange = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  server.searchPeople.mockResolvedValue(results)
})

function show(filters: SearchFilters) {
  return renderPage(
    <SearchPage
      organizationId="org"
      organization="demo"
      filters={filters}
      onFiltersChange={onFiltersChange}
    />,
    [
      [technologyCatalogueQuery('org').queryKey, testCatalogue],
      [roleCatalogueQuery('org').queryKey, testRoles],
      [criteriaQuery('org').queryKey, checklist],
      [searchQuery('org', filters).queryKey, results],
    ],
  )
}

describe('SearchPage', () => {
  it('search.filter-required: asks for a technology, role, or characteristic before searching', async () => {
    await show({})

    expect(
      screen.getByText('Choose at least one technology, role, or characteristic.'),
    ).toBeInTheDocument()
    expect(server.searchPeople).not.toHaveBeenCalled()
  })

  it('search.characteristics-only: picks characteristics, and searches by them alone', async () => {
    await show({})

    const group = within(screen.getByRole('group', { name: 'Solution characteristics' }))
    expect(group.getAllByRole('checkbox').map((each) => each.parentElement?.textContent)).toEqual([
      'X-Road',
      'Kubernetes',
    ])
    await userEvent.click(group.getByRole('checkbox', { name: 'X-Road' }))
    expect(onFiltersChange).toHaveBeenCalledWith({ c: ['xroad'] })
  })

  it('search.characteristics-all: shows the chosen characteristics on each matching project', async () => {
    server.searchPeople.mockResolvedValue(results)
    const filters = { c: ['xroad', 'k8s'] }
    const shown = structuredClone(results)
    const first = shown[0]?.items[0]
    if (first) {
      first.criteria = [
        { id: 'xroad', name: { et: 'X-tee', en: 'X-Road' } },
        { id: 'k8s', name: { et: 'Kubernetes', en: null } },
      ]
    }
    await renderPage(
      <SearchPage
        organizationId="org"
        organization="demo"
        filters={filters}
        onFiltersChange={onFiltersChange}
      />,
      [
        [technologyCatalogueQuery('org').queryKey, testCatalogue],
        [roleCatalogueQuery('org').queryKey, testRoles],
        [criteriaQuery('org').queryKey, checklist],
        [searchQuery('org', filters).queryKey, shown],
      ],
    )

    const erik = within(screen.getByRole('region', { name: 'Erik Employee' }))
    expect(
      within(erik.getByRole('list', { name: 'Solution characteristics' })).getAllByRole('listitem'),
    ).toHaveLength(2)
    expect(
      screen
        .getAllByRole('checkbox', { checked: true })
        .map((each) => each.parentElement?.textContent),
    ).toEqual(expect.arrayContaining(['X-Road', 'Kubernetes']))
  })

  it('search.any-technology: lists each person with the matching work, matched technologies marked', async () => {
    await show({ t: ['react'], leavers: true })

    expect(screen.getByRole('status')).toHaveTextContent('2 people')
    const erik = within(screen.getByRole('region', { name: 'Erik Employee' }))
    expect(erik.getByText('2 matching projects')).toBeInTheDocument()
    expect(erik.getByRole('link', { name: 'e-MTA deklaratsioonid' })).toHaveAttribute(
      'href',
      '/demo/projects/tax',
    )
    expect(erik.getAllByRole('listitem')[0]).toHaveTextContent(
      'Maksu- ja Tolliamet · Developer, Analyst · 05-2021 – 12-2023',
    )
  })

  it('search.role: picks roles, and marks the chosen ones on the matching work', async () => {
    await show({ t: ['react'], r: ['analyst'] })

    const roles = within(screen.getByRole('group', { name: 'Roles' }))
    expect(roles.getByRole('list', { name: 'Roles' })).toHaveTextContent('Analyst')
    await userEvent.type(roles.getByRole('combobox', { name: 'Add a role' }), 'arend')
    await userEvent.click(roles.getByRole('option', { name: /^Developer/ }))
    expect(onFiltersChange).toHaveBeenCalledWith({ t: ['react'], r: ['analyst', 'developer'] })

    const erik = within(screen.getByRole('region', { name: 'Erik Employee' }))
    expect(erik.getAllByRole('listitem')[0]).toHaveTextContent(
      'Maksu- ja Tolliamet · Developer, Analyst · 05-2021 – 12-2023',
    )
    expect(erik.getByText('Analyst').closest('strong')).not.toBeNull()
    expect(erik.getByText('Developer').closest('strong')).toBeNull()
  })

  it('search.pickers-catalogue-only: the pickers offer nothing to add to a catalogue', async () => {
    await show({ t: ['react'] })

    await userEvent.type(screen.getByRole('combobox', { name: /technology/i }), 'Svelte')
    await userEvent.type(screen.getByRole('combobox', { name: 'Add a role' }), 'Arhitekt')

    expect(screen.queryByRole('option')).not.toBeInTheDocument()
  })

  it('search.own-projects-included: marks own projects', async () => {
    await show({ t: ['react'] })

    const own = within(screen.getByRole('region', { name: 'Erik Employee' }))
    expect(own.getByText('Own project')).toBeInTheDocument()
    expect(own.queryByRole('link', { name: 'Riigiportaali liidesed' })).not.toBeInTheDocument()
  })

  it('search.make-cv: makes a CV of the chosen people with the same filter', async () => {
    await show({
      t: ['react'],
      match: 'all',
      r: ['analyst'],
      c: ['xroad'],
      from: '2019',
      leavers: true,
    })

    const make = screen.getByRole('link', { name: 'Make CV (1)' })
    const url = new URL(make.getAttribute('href') ?? '', 'http://localhost')
    expect(url.pathname).toBe('/demo/cvs')
    expect(url.searchParams.getAll('people')).toEqual(['erik'])
    expect(url.searchParams.getAll('t')).toEqual(['react'])
    expect(url.searchParams.get('match')).toBe('all')
    expect(url.searchParams.getAll('r')).toEqual(['analyst'])
    expect(url.searchParams.getAll('c')).toEqual(['xroad'])
    expect(url.searchParams.get('from')).toBe('2019')
    expect(url.searchParams.get('leavers')).toBe('true')

    // A leaver isn't chosen until ticked.
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select Tõnu Tamm' }))
    expect(screen.getByRole('link', { name: 'Make CV (2)' })).toBeInTheDocument()
  })

  it('search.all-technologies: switching the match updates the filter', async () => {
    await show({ t: ['react'] })

    await userEvent.click(screen.getByRole('radio', { name: 'All chosen technologies' }))
    expect(onFiltersChange).toHaveBeenCalledWith({ t: ['react'], match: 'all' })
  })

  it('search.period-overlap: a typed period goes into the filter, and a bad one says so', async () => {
    await show({ t: ['react'] })

    await userEvent.type(screen.getByLabelText('From'), '03-2019{Enter}')
    expect(onFiltersChange).toHaveBeenCalledWith({ t: ['react'], from: '2019-03' })

    await userEvent.type(screen.getByLabelText('To'), 'sometime')
    await userEvent.tab()
    expect(screen.getByText('Enter a year, a month and year, or a date.')).toBeInTheDocument()
  })

  it('search.leavers-shown: the leavers box goes into the filter', async () => {
    await show({ t: ['react'] })

    await userEvent.click(screen.getByRole('checkbox', { name: 'Show leavers' }))
    expect(onFiltersChange).toHaveBeenCalledWith({ t: ['react'], leavers: true })
  })

  it('says when nobody matches', async () => {
    server.searchPeople.mockResolvedValue([])
    await renderPage(
      <SearchPage
        organizationId="org"
        organization="demo"
        filters={{ t: ['angular'] }}
        onFiltersChange={onFiltersChange}
      />,
      [
        [technologyCatalogueQuery('org').queryKey, testCatalogue],
        [roleCatalogueQuery('org').queryKey, testRoles],
        [criteriaQuery('org').queryKey, checklist],
        [searchQuery('org', { t: ['angular'] }).queryKey, []],
      ],
    )

    expect(screen.getByText(/Nobody matches/)).toBeInTheDocument()
  })
})
