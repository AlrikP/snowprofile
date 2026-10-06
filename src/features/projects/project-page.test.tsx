import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ProjectView } from '#/server/projects/projects.functions'
import { renderPage } from '#/test/router'
import { ProjectPage } from './project-page'
import { projectQuery } from './projects-query'

vi.mock('#/server/projects/projects.functions', () => ({
  getProjects: vi.fn(),
  getProject: vi.fn(),
}))

const details: NonNullable<ProjectView['details']> = {
  tenderReference: '275431',
  totalHours: { value: 4200, qualifier: 'approximately' },
  cost: { value: 250000, qualifier: 'more_than' },
  contacts: [
    {
      id: 'c1',
      name: 'Mari Mets',
      email: 'mari@example.ee',
      phone: '+372 612 5000',
      noLongerValid: false,
    },
    { id: 'c2', name: 'Jüri Jõe', email: null, phone: null, noLongerValid: true },
  ],
}

function view(overrides: Partial<ProjectView> = {}): ProjectView {
  return {
    id: 'portal',
    name: 'Kodanikuportaali uuendus',
    customerName: 'Siseministeerium',
    description: { et: 'Uus kodanikuportaal.', en: null },
    startDate: '2024-03',
    endDate: null,
    technologies: [{ id: 't1', name: 'React' }],
    criteria: [
      {
        id: 'k1',
        name: { et: 'Automaattestid', en: 'Automated tests' },
        answer: true,
        note: 'JUnit',
      },
      { id: 'k2', name: { et: 'X-tee', en: null }, answer: false, note: null },
      { id: 'k3', name: { et: 'Monitooring', en: 'Monitoring' }, answer: null, note: null },
    ],
    people: [
      {
        participationId: 'pa1',
        profileId: 'pr1',
        fullName: 'Erik Employee',
        leftDate: null,
        startDate: '2024-05',
        endDate: null,
        mine: true,
        roles: [{ et: 'Arendaja', en: 'Developer' }],
      },
      {
        participationId: 'pa2',
        profileId: 'pr2',
        fullName: 'Liis Lepp',
        leftDate: '2025-02-28',
        startDate: '2024-03',
        endDate: '2025-02',
        mine: false,
        roles: [
          { et: 'Analüütik', en: 'Analyst' },
          { et: 'Testija', en: 'Tester' },
        ],
      },
    ],
    details,
    lastChange: { at: new Date('2026-10-06T14:05:00'), by: 'Anna Admin' },
    ...overrides,
  }
}

function show(project: ProjectView, { canEdit = false } = {}) {
  return renderPage(
    <ProjectPage organizationId="org" organization="demo" projectId="portal" canEdit={canEdit} />,
    [[projectQuery('org', 'portal').queryKey, project]],
  )
}

function section(name: string) {
  return within(screen.getByRole('region', { name }))
}

describe('ProjectPage', () => {
  it('shows the description, characteristics, and technologies', async () => {
    await show(view())

    expect(section('Description').getByText('Uus kodanikuportaal.')).toBeInTheDocument()
    expect(section('Description').getByText('No English')).toBeInTheDocument()
    const criteria = section('Solution characteristics').getAllByRole('listitem')
    expect(criteria.map((each) => each.textContent)).toEqual([
      'YesAutomated tests · JUnit',
      'NoX-teeNo English',
      'UnansweredMonitoring',
    ])
    expect(screen.getByRole('list', { name: 'Technologies' })).toHaveTextContent('React')
  })

  it('projects.people-listed: lists each person with roles and period, marking a leaver', async () => {
    await show(view())

    const people = section('Participants').getAllByRole('listitem')
    expect(people[0]).toHaveTextContent('Erik EmployeeDeveloper · 05-2024 – ongoing')
    expect(people[1]).toHaveTextContent('Liis LeppLeftAnalyst, Tester · 03-2024 – 02-2025')
  })

  it('projects.details-for-participant: shows the tender details and links to the participation', async () => {
    await show(view())

    expect(section('Tender details').getByText('275431')).toBeInTheDocument()
    expect(section('Tender details').getByText('approximately 4,200 h')).toBeInTheDocument()
    expect(section('Tender details').getByText('more than €250,000')).toBeInTheDocument()
    expect(section('Contact persons').getAllByRole('listitem')[1]).toHaveTextContent(
      'Jüri JõeNo longer valid',
    )
    expect(screen.getByRole('link', { name: 'Edit my participation' })).toHaveAttribute(
      'href',
      '/demo/profile?participation=pa1',
    )
  })

  it('projects.details-hidden: says the details are hidden when the response has none', async () => {
    await show(
      view({ details: null, people: view().people.map((person) => ({ ...person, mine: false })) }),
    )

    expect(screen.queryByRole('region', { name: 'Tender details' })).not.toBeInTheDocument()
    expect(screen.getByText(/see the tender details and contact persons/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Edit my participation' })).not.toBeInTheDocument()
  })

  it('projects.last-change: names who changed the project and when', async () => {
    await show(view())

    expect(screen.getByText(/^Last changed 6 Oct 2026\b.*14:05 by Anna Admin$/)).toBeInTheDocument()
  })

  it('names the system for a change by a script', async () => {
    await show(view({ lastChange: { at: new Date('2026-10-06T14:05:00'), by: null } }))

    expect(screen.getByText(/^Last changed 6 Oct 2026\b.*14:05 by the system$/)).toBeInTheDocument()
  })

  it('links admins to the edit form, and no one else', async () => {
    await show(view(), { canEdit: true })
    expect(screen.getByRole('link', { name: 'Edit project' })).toHaveAttribute(
      'href',
      '/demo/projects/portal/edit',
    )
  })

  it('shows no edit link without the permission', async () => {
    await show(view())
    expect(screen.queryByRole('link', { name: 'Edit project' })).not.toBeInTheDocument()
  })
})
