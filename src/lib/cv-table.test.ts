/// <reference types="bun" />

import { describe, expect, test } from 'bun:test'
import type { Cv } from '#/server/cvs/cvs.functions'
import { type CvBlock, type CvTable, cvBlocks, cvHtml, cvText } from './cv-table'

function en(text: string) {
  return { text, lang: 'en' as const, fallback: false }
}

const team: Cv = {
  language: 'en',
  people: [
    {
      id: 'erik',
      fullName: 'Erik Employee',
      birthDate: '1990-06-14',
      education: [
        {
          institution: en('University of Tartu'),
          field: en('Computer science'),
          degree: { text: 'Magistrikraad', lang: 'et', fallback: true },
          startDate: '2009',
          endDate: '2014',
        },
      ],
    },
    { id: 'kalle', fullName: 'Kalle Kask', birthDate: null, education: [] },
  ],
  projects: [
    {
      key: 'project:tax',
      kind: 'project',
      projectId: 'tax',
      name: 'e-MTA deklaratsioonid',
      employer: null,
      customerName: 'Maksu- ja Tolliamet',
      description: { text: 'Maksudeklaratsioonide e-teenus.', lang: 'et', fallback: true },
      parts: [
        {
          profileId: 'erik',
          roles: [en('Developer')],
          startDate: '2021-05',
          endDate: '2023-12',
          hours: { value: 3000, qualifier: 'more_than' },
          tasks: en('Built the declaration forms.\nBuilt the X-Road interfaces.'),
          technologies: ['Java', 'Angular'],
        },
        {
          profileId: 'kalle',
          roles: [en('Architect'), en('Team lead')],
          startDate: '2020-11',
          endDate: null,
          hours: { value: 1200, qualifier: 'approximately' },
          tasks: en('Designed the solution.'),
          technologies: ['Java', 'X-Road'],
        },
      ],
    },
    {
      key: 'own:portal',
      kind: 'own',
      projectId: null,
      name: 'Customer portal',
      employer: 'Nortal',
      customerName: 'Elisa Eesti',
      description: null,
      parts: [
        {
          profileId: 'erik',
          roles: [],
          startDate: '2016',
          endDate: '2019',
          hours: null,
          tasks: en('Order and "invoice" views.'),
          technologies: ['Oracle'],
        },
      ],
    },
  ],
  missing: [],
}

const personal: Cv = {
  ...team,
  people: team.people.slice(0, 1),
  projects: team.projects.map((project) => ({
    ...project,
    parts: project.parts.filter((part) => part.profileId === 'erik'),
  })),
}

// Each cell's text, its lines joined with " / ".
function cells(table: CvTable) {
  return table.rows.map((row) =>
    row.map((cell) => cell.lines.map((line) => line.map((span) => span.text).join('')).join(' / ')),
  )
}

function tables(blocks: CvBlock[]) {
  return blocks.flatMap((block) => (block.kind === 'table' ? [block.table] : []))
}

describe('cvBlocks', () => {
  test('cv-view.personal-table: the person, then their projects in the prototype’s columns', () => {
    const blocks = cvBlocks(personal, 'each')

    expect(blocks[0]).toEqual({
      kind: 'person',
      id: 'erik',
      name: 'Erik Employee',
      lines: [
        [{ text: 'Born 14 Jun 1990' }],
        [
          { text: 'University of Tartu', fallback: undefined },
          { text: ', ' },
          { text: 'Computer science', fallback: undefined },
          { text: ', ' },
          { text: 'Magistrikraad', fallback: { lang: 'et' } },
          { text: ' (2009 – 2014)' },
        ],
      ],
    })
    const [table] = tables(blocks)
    expect(table?.columns).toEqual([
      'Project',
      'Customer',
      'Period',
      'Role',
      'Size',
      'Technologies',
    ])
    expect(cells(table!)).toEqual([
      [
        'e-MTA deklaratsioonid / Maksudeklaratsioonide e-teenus.',
        'Maksu- ja Tolliamet',
        '05-2021 – 12-2023',
        'Developer / Built the declaration forms. / Built the X-Road interfaces.',
        'more than 3,000 h',
        'Java, Angular',
      ],
      [
        'Customer portal (Nortal)',
        'Elisa Eesti',
        '2016 – 2019',
        'Order and "invoice" views.',
        '',
        'Oracle',
      ],
    ])
  })

  test('cv-view.personal-table: an Estonian CV has Estonian columns', () => {
    const [table] = tables(cvBlocks({ ...personal, language: 'et' }, 'each'))

    expect(table?.columns).toEqual(['Projekt', 'Klient', 'Periood', 'Roll', 'Maht', 'Tehnoloogiad'])
  })

  test('cv-view.table-per-person: each person gets their heading and a table of their parts', () => {
    const blocks = cvBlocks(team, 'each')

    expect(blocks.map((block) => block.kind)).toEqual(['person', 'table', 'person', 'table'])
    const [, kalle] = tables(blocks)
    expect(cells(kalle!)).toEqual([
      [
        'e-MTA deklaratsioonid / Maksudeklaratsioonide e-teenus.',
        'Maksu- ja Tolliamet',
        '11-2020 – ongoing',
        'Architect, Team lead / Designed the solution.',
        'approximately 1,200 h',
        'Java, X-Road',
      ],
    ])
  })

  test('cv-view.combined-table: one table lists a shared project once, with each person’s part', () => {
    const blocks = cvBlocks(team, 'combined')

    expect(blocks.map((block) => block.kind)).toEqual(['person', 'person', 'table'])
    const [table] = tables(blocks)
    expect(table?.columns[3]).toBe('People and roles')
    expect(cells(table!)).toEqual([
      [
        'e-MTA deklaratsioonid / Maksudeklaratsioonide e-teenus.',
        'Maksu- ja Tolliamet',
        '11-2020 – ongoing',
        'Erik Employee: Developer – Built the declaration forms. Built the X-Road interfaces. / Kalle Kask: Architect, Team lead – Designed the solution.',
        'Erik Employee: more than 3,000 h / Kalle Kask: approximately 1,200 h',
        'Java, Angular, X-Road',
      ],
      [
        'Customer portal (Nortal)',
        'Elisa Eesti',
        '2016 – 2019',
        'Erik Employee: Order and "invoice" views.',
        '',
        'Oracle',
      ],
    ])
  })

  test('a personal CV ignores the combined layout', () => {
    expect(cvBlocks(personal, 'combined')).toEqual(cvBlocks(personal, 'each'))
  })
})

describe('copying', () => {
  test('cv-view.copy-html-and-text: the HTML has inline styles and marks fallbacks', () => {
    const html = cvHtml(cvBlocks(personal, 'each'), 'en')

    expect(html).toStartWith('<div lang="en"><h3>Erik Employee</h3><p>Born 14 Jun 1990<br>')
    expect(html).toContain('<table style="border-collapse: collapse">')
    expect(html).toContain('<th style="border: 1px solid #999;')
    expect(html).toContain('<td style="border: 1px solid #999;')
    expect(html).toContain(
      '<td style="border: 1px solid #999; padding: 4px 6px; text-align: left; vertical-align: top"><strong>e-MTA deklaratsioonid</strong><br><span lang="et" style="background-color: #fef3c7; color: #78350f">Maksudeklaratsioonide e-teenus.</span></td>',
    )
    expect(html).toContain('Order and &quot;invoice&quot; views.')
    expect(html).not.toContain('class=')
  })

  test('cv-view.copy-html-and-text: the text has each table as tab-separated rows', () => {
    const text = cvText(cvBlocks(personal, 'each'))

    expect(text.split('\n\n')[0]).toBe(
      'Erik Employee\nBorn 14 Jun 1990\nUniversity of Tartu, Computer science, Magistrikraad (2009 – 2014)',
    )
    const rows = text.split('\n\n')[1]
    expect(rows).toStartWith('Project\tCustomer\tPeriod\tRole\tSize\tTechnologies\n')
    expect(rows).toContain(
      '\t"Developer\nBuilt the declaration forms.\nBuilt the X-Road interfaces."\tmore than 3,000 h\t',
    )
    expect(rows).toEndWith('\t"Order and ""invoice"" views."\t\tOracle')
  })
})
