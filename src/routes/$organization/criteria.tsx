import { createFileRoute } from '@tanstack/react-router'
import { PagePlaceholder } from '#/components/page-placeholder'
import { m } from '#/paraglide/messages.js'

export const Route = createFileRoute('/$organization/criteria')({
  component: () => <PagePlaceholder title={m.nav_criteria()} />,
})
