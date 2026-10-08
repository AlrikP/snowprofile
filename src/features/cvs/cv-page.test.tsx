import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { type Criterion, criteriaQuery } from '#/lib/criteria'
import { peopleQuery } from '#/lib/people'
import { roleCatalogueQuery } from '#/lib/role-catalogue'
import { technologyCatalogueQuery } from '#/lib/technology-catalogue'
import type { Cv } from '#/server/cvs/cvs.functions'
import type { Person } from '#/server/profiles/profiles.functions'
import { testRoles } from '#/test/role-catalogue'
import { renderPage } from '#/test/router'
import { testCatalogue } from '#/test/technology-catalogue'
import { CvPage } from './cv-page'
import { cvQuery } from './cv-query'
import { type CvSelection, cvInput } from './cv-selection'

const server = vi.hoisted(() => ({ getCv: vi.fn() }))
vi.mock('#/server/cvs/cvs.functions', () => server)
vi.mock('#/server/profiles/profiles.functions', () => ({ getPeople: vi.fn() }))
vi.mock('#/server/roles/roles.functions', () => ({ getRoleCatalogue: vi.fn(), addRole: vi.fn() }))
vi.mock('#/server/criteria/criteria.functions', () => ({ getCriteria: vi.fn() }))
vi.mock('#/server/technologies/technologies.functions', () => ({
  getTechnologyCatalogue: vi.fn(),
  addTechnology: vi.fn(),
}))

function person(id: string, fullName: string, leftDate: string | null = null): Person {
  return {
    id,
    fullName,
    leftDate,
    confirmedAt: null,
    participations: 1,
    requestedAt: null,
    you: false,
    canMarkLeft: leftDate === null,
  }
}

const checklist: Criterion[] = [
  { id: 'xroad', nameEt: 'X-tee', nameEn: 'X-Road', answers: 3 },
  { id: 'k8s', nameEt: 'Kubernetes', nameEn: 'Kubernetes', answers: 1 },
]

const people = [
  person('erik', 'Erik Employee'),
  person('kalle', 'Kalle Kask'),
  person('tonu', 'Tõnu Tamm', '2025-12-31'),
]

const english: Cv = {
  language: 'en',
  people: [
    {
      id: 'erik',
      fullName: 'Erik Employee',
      birthDate: '1990-06-14',
      education: [
        {
          institution: { text: 'Tartu Ülikool', lang: 'et', fallback: true },
          field: { text: 'Computer science', lang: 'en', fallback: false },
          degree: null,
          startDate: '2009',
          endDate: '2012',
        },
      ],
    },
  ],
  projects: [
    {
      key: 'project:api',
      kind: 'project',
      projectId: 'api',
      name: 'Äriregistri avaandmete API',
      employer: null,
      customerName: 'Registrite ja Infosüsteemide Keskus',
      description: { text: 'Äriregistri avaandmed API kaudu.', lang: 'et', fallback: true },
      parts: [
        {
          profileId: 'erik',
          roles: [{ text: 'Developer', lang: 'en', fallback: false }],
          startDate: '2020-02',
          endDate: '2020-11',
          hours: { value: 900, qualifier: 'approximately' },
          tasks: { text: 'Built the REST API.', lang: 'en', fallback: false },
          technologies: ['Java', 'PostgreSQL'],
        },
      ],
    },
  ],
  missing: [
    {
      field: 'project_description',
      name: 'Äriregistri avaandmete API',
      person: null,
      fix: { page: 'project', projectId: 'api' },
    },
    { field: 'role', name: 'Analüütik', person: null, fix: { page: 'roles' } },
    {
      field: 'education',
      name: 'Tartu Ülikool',
      person: 'Erik Employee',
      fix: { page: 'people' },
    },
  ],
}

const onSelectionChange = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  server.getCv.mockResolvedValue(english)
})

function show(selection: CvSelection, cv: Cv | null = english) {
  const data: [readonly unknown[], unknown][] = [
    [peopleQuery('org').queryKey, people],
    [technologyCatalogueQuery('org').queryKey, testCatalogue],
    [roleCatalogueQuery('org').queryKey, testRoles],
    [criteriaQuery('org').queryKey, checklist],
  ]
  if (cv) data.push([cvQuery('org', cvInput(selection)).queryKey, cv])
  return renderPage(
    <CvPage
      organizationId="org"
      organization="demo"
      selection={selection}
      onSelectionChange={onSelectionChange}
    />,
    data,
  )
}

describe('CvPage', () => {
  it('asks for a person before making a CV', async () => {
    await show({}, null)

    expect(screen.getByText('Choose at least one person.')).toBeInTheDocument()
    expect(server.getCv).not.toHaveBeenCalled()
  })

  it('cv-selection.personal: picks a person by name', async () => {
    await show({}, null)

    await userEvent.type(screen.getByRole('combobox', { name: 'Add person' }), 'kal')
    await userEvent.click(screen.getByRole('option', { name: 'Kalle Kask' }))

    expect(onSelectionChange).toHaveBeenCalledWith({ people: ['kalle'] })
  })

  it('cv-selection.team: adds a second person and removes one', async () => {
    await show({ people: ['erik', 'kalle'] })

    const chosen = within(screen.getByRole('list', { name: 'People' }))
    expect(chosen.getAllByRole('listitem').map((each) => each.textContent)).toEqual([
      'Erik Employee',
      'Kalle Kask',
    ])
    await userEvent.click(screen.getByRole('button', { name: 'Remove Erik Employee' }))
    expect(onSelectionChange).toHaveBeenCalledWith({ people: ['kalle'] })
  })

  it('cv-selection.leavers-hidden: leavers are offered only when asked for', async () => {
    await show({}, null)
    const combobox = screen.getByRole('combobox', { name: 'Add person' })

    await userEvent.type(combobox, 't')
    expect(screen.queryByRole('option', { name: /Tõnu Tamm/ })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Show leavers' }))
    expect(onSelectionChange).toHaveBeenCalledWith({ leavers: true })
  })

  it('cv-selection.people-suggested: an empty field suggests the current people in name order', async () => {
    await show({ people: ['kalle'] }, null)
    const combobox = screen.getByRole('combobox', { name: 'Add person' })

    await userEvent.click(combobox)
    expect(combobox).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getAllByRole('option').map((each) => each.textContent)).toEqual(['Erik Employee'])
    await userEvent.keyboard('{Escape}')
    expect(combobox).toHaveAttribute('aria-expanded', 'false')
    await userEvent.keyboard('{ArrowDown}{Enter}')
    expect(onSelectionChange).toHaveBeenCalledWith({ people: ['kalle', 'erik'] })
  })

  it('cv-selection.leavers-hidden: a leaver is offered with the leavers shown', async () => {
    await show({ leavers: true }, null)

    await userEvent.type(screen.getByRole('combobox', { name: 'Add person' }), 'tõnu')
    expect(screen.getByRole('option', { name: /Tõnu Tamm/ })).toHaveTextContent('Left')
  })

  it('cv-selection.language: switching the language goes into the selection', async () => {
    await show({ people: ['erik'] })

    await userEvent.click(screen.getByRole('radio', { name: 'English' }))
    expect(onSelectionChange).toHaveBeenCalledWith({ people: ['erik'], lang: 'en' })
  })

  it('cv-selection.birth-date-opt-in: the birth date is included only when ticked', async () => {
    await show({ people: ['erik'] })

    const birth = screen.getByRole('checkbox', { name: 'Include date of birth' })
    expect(birth).not.toBeChecked()
    await userEvent.click(birth)
    expect(onSelectionChange).toHaveBeenCalledWith({ people: ['erik'], birth: true })
  })

  it('cv-selection.all-projects: all projects by default, and choosing all clears the filter', async () => {
    await show({ people: ['erik'], t: ['react'], from: '2019' })

    expect(
      screen.getByRole('radio', { name: 'By technology, role, characteristic, or period' }),
    ).toBeChecked()
    expect(screen.getByLabelText('From')).toHaveValue('2019')
    await userEvent.click(screen.getByRole('radio', { name: 'All projects' }))
    expect(onSelectionChange).toHaveBeenCalledWith({ people: ['erik'] })
    expect(screen.queryByLabelText('From')).not.toBeInTheDocument()
  })

  it('cv-selection.filtered-by-technology: a technology goes into the filter', async () => {
    await show({ people: ['erik'] })

    expect(screen.getByRole('radio', { name: 'All projects' })).toBeChecked()
    await userEvent.click(
      screen.getByRole('radio', { name: 'By technology, role, characteristic, or period' }),
    )
    await userEvent.type(
      screen.getByRole('combobox', { name: 'Add a technology from the catalogue' }),
      'angu{Enter}',
    )
    expect(onSelectionChange).toHaveBeenCalledWith({ people: ['erik'], t: ['angular'] })
  })

  it('cv-selection.filtered-by-role: a role goes into the filter, and the picker adds nothing', async () => {
    await show({ people: ['erik'], t: ['react'] })

    await userEvent.type(screen.getByRole('combobox', { name: 'Add a role' }), 'Arhitekt')
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
    await userEvent.clear(screen.getByRole('combobox', { name: 'Add a role' }))
    await userEvent.type(screen.getByRole('combobox', { name: 'Add a role' }), 'analyst{Enter}')
    expect(onSelectionChange).toHaveBeenCalledWith({
      people: ['erik'],
      t: ['react'],
      r: ['analyst'],
    })
  })

  it('cv-selection.filtered-by-characteristic: a characteristic goes into the filter', async () => {
    await show({ people: ['erik'], c: ['k8s'] })

    expect(screen.getByRole('radio', { name: /By technology/ })).toBeChecked()
    const group = within(screen.getByRole('group', { name: 'Solution characteristics' }))
    expect(group.getByRole('checkbox', { name: 'Kubernetes' })).toBeChecked()
    await userEvent.click(group.getByRole('checkbox', { name: 'X-Road' }))
    expect(onSelectionChange).toHaveBeenCalledWith({ people: ['erik'], c: ['k8s', 'xroad'] })
  })

  it('cv-selection.missing-translations-listed: lists each missing translation with where it is fixed', async () => {
    await show({ people: ['erik'], lang: 'en', birth: true })

    const missing = within(screen.getByRole('region', { name: 'Missing translations: 3' }))
    const items = missing.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Äriregistri avaandmete API · Project description')
    expect(within(items[0]!).getByRole('link', { name: 'Edit the project' })).toHaveAttribute(
      'href',
      '/demo/projects/api/edit',
    )
    expect(within(items[1]!).getByRole('link', { name: 'Open roles' })).toHaveAttribute(
      'href',
      '/demo/roles',
    )
    expect(items[2]).toHaveTextContent('Erik Employee')
    expect(within(items[2]!).getByRole('link', { name: 'Ask to update' })).toHaveAttribute(
      'href',
      '/demo/people',
    )

    // The CV still shows, the Estonian text marked.
    const preview = within(screen.getByRole('region', { name: 'Preview' }))
    expect(preview.getByText('Born 14 Jun 1990')).toBeInTheDocument()
    expect(preview.getByText('Äriregistri avaandmed API kaudu.')).toHaveAttribute('lang', 'et')
    expect(preview.getByText('Äriregistri avaandmed API kaudu.')).toHaveAttribute(
      'title',
      'No English',
    )
    expect(preview.getByText(/approximately 900 h/)).toBeInTheDocument()
  })

  it('lists no missing translations when there are none', async () => {
    await show({ people: ['erik'] }, { ...english, language: 'et', missing: [] })

    expect(screen.queryByRole('region', { name: /Missing translations/ })).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Preview' })).toBeInTheDocument()
  })

  it('cv-view.table-per-person: a team CV can switch to one shared table', async () => {
    await show({ people: ['erik', 'kalle'] })

    expect(screen.getByRole('radio', { name: 'A table per person' })).toBeChecked()
    await userEvent.click(screen.getByRole('radio', { name: 'One shared table' }))
    expect(onSelectionChange).toHaveBeenCalledWith({
      people: ['erik', 'kalle'],
      layout: 'combined',
    })
  })

  it('cv-view.combined-table: a personal CV offers no team layout', async () => {
    await show({ people: ['erik'] })

    expect(screen.queryByRole('radio', { name: 'One shared table' })).not.toBeInTheDocument()
  })

  it('cv-view.provisional-columns: shows the table and says the columns are provisional', async () => {
    await show({ people: ['erik'], lang: 'en' })

    const view = within(screen.getByRole('region', { name: 'Preview' }))
    expect(view.getByText(/The columns are provisional/)).toBeInTheDocument()
    expect(view.getAllByRole('columnheader').map((each) => each.textContent)).toEqual([
      'Project',
      'Customer',
      'Period',
      'Role',
      'Size',
      'Technologies',
    ])
  })

  it('cv-view.copy-html-and-text: copies the table as HTML and as plain text', async () => {
    const write = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal(
      'ClipboardItem',
      class {
        items: Record<string, Blob>
        constructor(items: Record<string, Blob>) {
          this.items = items
        }
      },
    )
    Object.defineProperty(navigator, 'clipboard', { value: { write }, configurable: true })
    await show({ people: ['erik'], lang: 'en' })

    await userEvent.click(screen.getByRole('button', { name: 'Copy table' }))

    // write([item]): the first call's one argument is the list of items.
    const item = write.mock.calls[0]?.[0]?.[0] as { items: Record<string, Blob> }
    expect(Object.keys(item.items)).toEqual(['text/html', 'text/plain'])
    expect(await item.items['text/html']?.text()).toContain(
      '<table style="border-collapse: collapse">',
    )
    expect(await item.items['text/plain']?.text()).toContain('Project\tCustomer\t')
    expect(screen.getByRole('status')).toHaveTextContent('Copied.')
    vi.unstubAllGlobals()
  })

  it('cv-document.language: downloads the DOCX of the same CV', async () => {
    await show({
      people: ['erik'],
      lang: 'en',
      birth: true,
      t: ['react'],
      r: ['analyst'],
      c: ['xroad'],
    })

    const link = screen.getByRole('link', { name: 'Download DOCX' })
    const url = new URL(link.getAttribute('href') ?? '', 'http://localhost')
    expect(url.pathname).toBe('/api/cv-document')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      organizationId: 'org',
      language: 'en',
      people: 'erik',
      t: 'react',
      r: 'analyst',
      c: 'xroad',
      birth: 'true',
    })
  })
})
