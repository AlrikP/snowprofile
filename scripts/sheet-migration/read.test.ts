/// <reference types="bun" />

import { beforeAll, describe, expect, test } from 'bun:test'
import { sheetReport } from '../sheet-report'
import { fictionalWorkbook } from './fixture'
import { readWorkbook, type Workbook } from './read'

let workbook: Workbook

beforeAll(async () => {
  workbook = await readWorkbook(await fictionalWorkbook())
})

function person(name: string) {
  const found = workbook.people.find((each) => each.fullName === name)
  if (!found) throw new Error(`no ${name}`)
  return found
}

describe('the Projektid sheet', () => {
  test('reads each project by its number', () => {
    expect(workbook.projects.map((each) => each.number)).toEqual([1, 2, 3, 4])
    expect(workbook.projects[0]).toEqual({
      number: 1,
      name: 'Kalarahva portaal',
      description: 'Kalastuslubade e-teenus.',
      period: { startDate: '2020-05', endDate: '2022-02' },
      customer: 'Kalaamet',
      tenderReference: '123456',
      contact: 'Mari Kask mari@kalaamet.example',
      totalHours: { value: 12000, qualifier: 'more_than' },
      cost: { value: 700000, qualifier: 'more_than' },
      technologies: [
        { name: 'React', category: 'Frontend' },
        { name: 'Typescript', category: 'Frontend' },
        { name: 'Redux', category: 'Frontend' },
        { name: 'Java', category: 'Backend' },
        { name: 'Spring Boot', category: 'Backend' },
        { name: 'Postgres', category: 'Backend' },
      ],
      answers: [
        { criterion: 'Automaattestid', answer: 'Jah' },
        { criterion: 'REST ja SOAP veebiteenused', answer: 'REST' },
        { criterion: 'Relatsiooniline andmebaas (postgres vms)', answer: 'Jah' },
        { criterion: 'X-tee, sh sõnumi struktuuriga (SOAP)', answer: 'Jah (REST)' },
      ],
    })
  })

  test('reads every period variant', () => {
    expect(workbook.projects.map((each) => each.period)).toEqual([
      { startDate: '2020-05', endDate: '2022-02' },
      { startDate: '2021-10', endDate: null },
      { startDate: '2015-06', endDate: '2018-12' },
      null,
    ])
  })
})

describe('an employee sheet', () => {
  test('reads the profile, with the company email lowercased', () => {
    const anna = person('Anna Arendaja')
    expect(anna).toMatchObject({
      sheet: 'Anna ✅',
      email: 'anna.arendaja@snowhound.example',
      birthDate: '1990-06-14',
      joinDate: '2021-03-01',
    })
    expect(anna.education).toEqual([
      {
        institution: 'Tartu Ülikool',
        field: 'Informaatika',
        degree: 'Bakalaureusekraad',
        period: { startDate: '2009', endDate: '2012' },
      },
      {
        institution: 'Tallinna Tehnikaülikool',
        field: 'Tarkvaratehnika',
        degree: null,
        period: { startDate: '2019', endDate: null },
      },
    ])
  })

  test('never reads the personal ID code', () => {
    expect(JSON.stringify(workbook)).not.toContain('49006140000')
  })

  test('reads participations by project number or name', () => {
    expect(person('Anna Arendaja').participations).toEqual([
      {
        project: { number: 1 },
        period: { startDate: '2020-05', endDate: null },
        roles: ['Arendaja'],
        hours: { value: 3000, qualifier: 'approximately' },
        tasks: 'Kasutajaliidese arendus.',
      },
      {
        project: { number: 2 },
        period: null,
        roles: ['Arhitekt', 'team lead'],
        hours: { value: 2100, qualifier: 'exact' },
        tasks: null,
      },
      {
        project: { number: 3 },
        period: { startDate: '2018', endDate: '2020' },
        roles: ['Tehniline analüütik', 'arhitekt'],
        hours: { value: 3350, qualifier: 'more_than' },
        tasks: null,
      },
      {
        project: { name: 'Telia iseteenindus', normalizedName: 'teliaiseteenindus' },
        period: { startDate: '2022-03-01', endDate: null },
        roles: ['(noorem)Arendaja'],
        hours: { value: 10000, qualifier: 'more_than' },
        tasks: 'Iseteeninduse arendus.',
      },
    ])
  })

  test('reads own projects, with the person’s share of the size', () => {
    expect(person('Anna Arendaja').ownProjects).toEqual([
      {
        name: 'Kliendiportaal',
        description: 'Varasema tööandja projekt.',
        period: { startDate: '2016-09', endDate: '2019-01' },
        customer: 'Elektrifirma AS',
        tenderReference: null,
        contact: null,
        totalHours: { value: 15000, qualifier: 'more_than' },
        hours: { value: 1000, qualifier: 'more_than' },
        technologies: [
          { name: 'Java', category: null },
          { name: 'aranea', category: null },
          { name: 'AngularJS', category: null },
          { name: 'Angular', category: null },
        ],
        answers: [{ criterion: 'Automaattestid', answer: '✅' }],
      },
    ])
  })

  test('skips the blank template sheet', () => {
    expect(workbook.people.map((each) => each.sheet)).toEqual(['Anna ✅', 'Peeter'])
  })
})

describe('the report', () => {
  test('sheet-migration.unparsed-reported: lists each value it couldn’t read with its sheet, cell, and reason', () => {
    expect(workbook.report.entries).toEqual([
      {
        sheet: 'Projektid',
        cell: 'E4',
        value: 'juuni-okt 2024',
        reason: 'Not a date: use a month and year (05.2020), a year, or "jätkuv".',
      },
      {
        sheet: 'Anna ✅',
        cell: 'C15',
        value: '10.202',
        reason: 'Not a date: use a month and year (05.2020), a year, or "jätkuv".',
      },
      {
        sheet: 'Peeter',
        cell: 'B1',
        value: 'Peeter Puudub',
        reason: 'No company email: add an "E-post:" row under "Nimi:".',
      },
      {
        sheet: 'Peeter',
        cell: 'B8',
        value: '2020-2025 (lõputöö pooleli)',
        reason: 'Not a period: use two years, 2017-2020, or 2019- while ongoing.',
      },
      {
        sheet: 'Peeter',
        cell: 'B14',
        value: 'juuni-okt 2024',
        reason: 'Not a date: use a month and year (05.2020), a year, or "jätkuv".',
      },
      {
        sheet: 'Peeter',
        cell: 'C15',
        value: '2022-01-01',
        reason: 'The end is before the start.',
      },
      {
        sheet: 'Peeter',
        cell: 'C17',
        value: 'Isiklikult kõvasti',
        reason: 'Not a number: use 3500, ~3500, or > 3500, with nothing else.',
      },
      {
        sheet: 'Peeter',
        cell: 'D13',
        value: '2022-08-01',
        reason: 'A date, not a project number or name.',
      },
    ])
  })

  test('sheet-migration.unparsed-reported: the script prints it when it ends', async () => {
    const printed = await sheetReport(await fictionalWorkbook())

    expect(printed).toStartWith(
      "Read 4 projects and 2 people, with 6 participations and 1 own projects.\n8 values weren't read:",
    )
    expect(printed).toContain('\n\nPeeter\n  B1    "Peeter Puudub": No company email')
    expect(printed).toContain('\n  C15   "2022-01-01": The end is before the start.\n')
  })
})
