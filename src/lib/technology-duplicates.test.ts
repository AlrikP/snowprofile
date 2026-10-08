/// <reference types="bun" />

import { describe, expect, test } from 'bun:test'
import { CATEGORIES } from '#/db/demo/vocabulary'
import { areNearDuplicates, nearDuplicatePairs } from './technology-duplicates'

// The pairs task 042 checked the rule against: variants typed in practice, each beside
// the catalogue entry it means.
const INTENDED = [
  ['Postgres', 'PostgreSQL'],
  ['React.js', 'React'],
  ['ReactJS', 'React'],
  ['Vue', 'Vue.js'],
  ['Vue 3', 'Vue.js'],
  ['Node', 'Node.js'],
  ['Golang', 'Go'],
  ['Elastic', 'Elasticsearch'],
  ['Elasticsearch 8', 'Elasticsearch'],
  ['Tailwind', 'Tailwind CSS'],
  ['Oracle DB', 'Oracle'],
  ['Next', 'Next.js'],
  ['.NET Core', '.NET'],
  ['X-Road', 'X-tee'],
  ['K8s', 'Kubernetes'],
  ['TS', 'TypeScript'],
  ['JS', 'JavaScript'],
  ['Angular 9', 'Angular'],
  ['Python 3', 'Python'],
  ['Java 21', 'Java'],
  ['Spring Boot 3', 'Spring Boot'],
  ['Mongo', 'MongoDB'],
] as const

// Names that look alike but are different technologies.
const DISTINCT = [
  ['Java', 'JavaScript'],
  ['Spring', 'Spring Boot'],
  ['MySQL', 'MSSQL'],
  ['C', 'C#'],
  ['C#', 'C++'],
  ['Kafka', 'Kafka Streams'],
  ['Docker', 'Docker Compose'],
  ['Grafana', 'Grafana Loki'],
  ['Oracle', 'Oracle Forms'],
  ['Java EE', 'Java'],
  ['GraphQL', 'Grafana'],
] as const

function entry(name: string, projects = 0, people = 0) {
  return { id: name, name, projects, people }
}

describe('the near-duplicate rule', () => {
  test.each(INTENDED)('pairs %s with %s', (a, b) => {
    expect(areNearDuplicates(a, b)).toBe(true)
  })

  test.each(DISTINCT)('keeps %s apart from %s', (a, b) => {
    expect(areNearDuplicates(a, b)).toBe(false)
  })

  test('reads a name that is also an object property as a name', () => {
    expect(areNearDuplicates('Constructor', 'Constructor JS')).toBe(true)
    expect(areNearDuplicates('Constructor', 'React')).toBe(false)
  })

  test('leaves exact duplicates to the catalogue, which refuses them', () => {
    expect(areNearDuplicates('Node.js', 'NodeJS')).toBe(false)
  })

  test('finds no pair in the seed’s catalogue', () => {
    const seeded = CATEGORIES.flatMap((category) =>
      category.technologies.map((name) => entry(name)),
    )
    expect(nearDuplicatePairs(seeded, [])).toEqual([])
  })

  // The one false match found when the rule was checked; admins mark it "Not a duplicate".
  test('pairs Angular with AngularJS', () => {
    expect(areNearDuplicates('Angular', 'AngularJS')).toBe(true)
  })
})

describe('pairs in a catalogue', () => {
  test('keeps the more used entry, or else the plain spelling, and merges the other', () => {
    const pairs = nearDuplicatePairs(
      [entry('Postgres', 1, 2), entry('PostgreSQL', 4, 9), entry('React.js'), entry('React')],
      [],
    )
    expect(pairs.map(({ from, into }) => [from.name, into.name])).toEqual([
      ['Postgres', 'PostgreSQL'],
      ['React.js', 'React'],
    ])
    const tie = nearDuplicatePairs(
      [entry('K8s'), entry('Kubernetes'), entry('Java 21'), entry('Java')],
      [],
    )
    expect(tie.map(({ into }) => into.name).sort()).toEqual(['Java', 'Kubernetes'])
  })

  test('leaves out a pair an admin marked "Not a duplicate", in either order', () => {
    const catalogue = [entry('Angular'), entry('AngularJS'), entry('Vue'), entry('Vue.js')]
    const pairs = nearDuplicatePairs(catalogue, [
      { technologyId: 'AngularJS', otherTechnologyId: 'Angular' },
    ])
    expect(pairs.map(({ from }) => from.name)).toEqual(['Vue.js'])
  })
})
