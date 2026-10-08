import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { projectsQuery } from '#/lib/project-list'
import type { ProjectListItem } from '#/server/projects/projects.functions'
import { renderPage } from '#/test/router'
import { ProjectsPage } from './projects-page'

vi.mock('#/server/projects/projects.functions', () => ({
  getProjects: vi.fn(),
  getProject: vi.fn(),
}))

function project(overrides: Partial<ProjectListItem>): ProjectListItem {
  return {
    id: 'p',
    name: 'Project',
    customerName: 'Elering',
    startDate: '2024-03',
    endDate: null,
    people: 3,
    mine: false,
    technologies: [],
    ...overrides,
  }
}

const projects = [
  project({
    id: 'portal',
    name: 'Kodanikuportaali uuendus',
    customerName: 'Siseministeerium',
    mine: true,
    people: 5,
    technologies: ['React', 'TypeScript', 'Java', 'Kotlin', 'Gradle'].map((name) => ({
      id: name,
      name,
    })),
  }),
  project({ id: 'grid', name: 'Võrguandmete platvorm', startDate: '2023-09' }),
  project({
    id: 'tax',
    name: 'e-MTA deklaratsioonid',
    customerName: null,
    startDate: '2021-05',
    endDate: '2023-12',
    mine: true,
  }),
]

function show(list = projects, { canCreate = false } = {}) {
  return renderPage(
    <ProjectsPage organizationId="org" organization="demo" canCreate={canCreate} />,
    [[projectsQuery('org').queryKey, list]],
  )
}

function names() {
  return screen.getAllByRole('link').map((each) => each.textContent)
}

describe('ProjectsPage', () => {
  it('projects.list: lists the projects with customer, period, and technologies', async () => {
    await show()

    expect(names()).toEqual([
      'Kodanikuportaali uuendus',
      'Võrguandmete platvorm',
      'e-MTA deklaratsioonid',
    ])
    expect(screen.getByRole('link', { name: 'Kodanikuportaali uuendus' })).toHaveAttribute(
      'href',
      '/demo/projects/portal',
    )
    const portal = screen.getByRole('row', { name: /Kodanikuportaali/ })
    expect(portal).toHaveTextContent('Siseministeerium')
    expect(portal).toHaveTextContent('03-2024 – ongoing')
    expect(portal).toHaveTextContent('ReactTypeScriptJava+2')
    expect(screen.getByRole('row', { name: /e-MTA/ })).toHaveTextContent('No customer')
    expect(screen.getByText('3 projects')).toBeInTheDocument()
  })

  it('projects.only-mine: narrows the list to the projects the person took part in', async () => {
    await show()

    await userEvent.click(screen.getByRole('checkbox', { name: 'Only my projects' }))

    expect(names()).toEqual(['Kodanikuportaali uuendus', 'e-MTA deklaratsioonid'])
  })

  it('filters by name and customer, and says when nothing matches', async () => {
    await show()

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Customer' }), 'Elering')
    expect(names()).toEqual(['Võrguandmete platvorm'])
    await userEvent.type(screen.getByRole('searchbox'), 'blockchain')
    expect(screen.getByText('No project matches.')).toBeInTheDocument()
  })

  it('projects.show-more: shows the first 50, finds the rest by filter, and shows more on request', async () => {
    const many = Array.from({ length: 120 }, (_, index) =>
      project({ id: `p${index}`, name: `Projekt ${String(index).padStart(3, '0')}` }),
    )
    await show(many)

    expect(names()).toHaveLength(50)
    expect(screen.getByText('120 projects')).toBeInTheDocument()
    await userEvent.type(screen.getByRole('searchbox'), 'Projekt 119')
    expect(names()).toEqual(['Projekt 119'])
    await userEvent.clear(screen.getByRole('searchbox'))

    await userEvent.click(screen.getByRole('button', { name: 'Show 50 more' }))
    expect(names()).toHaveLength(100)
    await userEvent.click(screen.getByRole('button', { name: 'Show 20 more' }))
    expect(names()).toHaveLength(120)
    expect(screen.queryByRole('button', { name: /^Show \d+ more$/ })).not.toBeInTheDocument()
  })

  it('offers adding a project only to those who may', async () => {
    await show(projects, { canCreate: true })
    expect(screen.getByRole('link', { name: 'Add project' })).toHaveAttribute(
      'href',
      '/demo/projects/new',
    )
  })

  it('says when there are no projects', async () => {
    await show([])

    expect(screen.getByText('No projects yet.')).toBeInTheDocument()
  })
})
