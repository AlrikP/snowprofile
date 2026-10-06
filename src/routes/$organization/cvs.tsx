import { createFileRoute } from '@tanstack/react-router'
import * as v from 'valibot'
import { PagePlaceholder } from '#/components/page-placeholder'
import { readSearchFilters, type SearchFilters } from '#/lib/search-filters'
import { m } from '#/paraglide/messages.js'

// Search's "Make CV" opens this page with the chosen people (profile IDs) and the search's
// filter; CV selection (task 036) reads them.
export const Route = createFileRoute('/$organization/cvs')({
  validateSearch: (search: Record<string, unknown>): SearchFilters & { people?: string[] } => {
    const people = v.safeParse(v.array(v.string()), search.people)
    return { ...readSearchFilters(search), ...(people.success && { people: people.output }) }
  },
  component: () => <PagePlaceholder title={m.nav_cvs()} />,
})
