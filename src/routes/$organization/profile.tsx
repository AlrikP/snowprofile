import { createFileRoute } from '@tanstack/react-router'
import { PagePlaceholder } from '#/components/page-placeholder'
import { m } from '#/paraglide/messages.js'

// ?participation=<id> opens that participation for editing; a project page links here.
export const Route = createFileRoute('/$organization/profile')({
  validateSearch: (search: Record<string, unknown>): { participation?: string } =>
    typeof search.participation === 'string' ? { participation: search.participation } : {},
  component: () => <PagePlaceholder title={m.nav_my_profile()} />,
})
