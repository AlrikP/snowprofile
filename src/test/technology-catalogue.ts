// A small catalogue for component tests of the technologies page and the picker.
import type { TechnologyCatalogue } from '#/lib/technology-catalogue'

export const testCatalogue: TechnologyCatalogue = {
  categories: [
    { id: 'frontend', nameEt: 'Frontend', nameEn: 'Frontend' },
    { id: 'data', nameEt: 'Andmed', nameEn: 'Data' },
  ],
  technologies: [
    { id: 'react', name: 'React', categoryId: 'frontend', projects: 12, people: 30 },
    { id: 'angular', name: 'Angular', categoryId: 'frontend', projects: 4, people: 9 },
    {
      id: 'postgresql',
      name: 'PostgreSQL',
      categoryId: 'data',

      projects: 20,
      people: 41,
    },
    { id: 'postgres', name: 'Postgres', categoryId: 'data', projects: 2, people: 3 },
  ],
  distinctPairs: [],
}
