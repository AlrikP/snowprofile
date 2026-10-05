import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/$organization/')({
  beforeLoad: ({ params }) => {
    throw redirect({ to: '/$organization/profile', params })
  },
})
