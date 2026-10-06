import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { render } from '@testing-library/react'
import type { ReactNode } from 'react'

// Renders a page whose links need a router, with a query client already holding the
// page's data. The router has no routes of its own: links render with their href.
export async function renderPage(page: ReactNode, data: [readonly unknown[], unknown][]) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  for (const [key, value] of data) queryClient.setQueryData(key, value)
  const router = createRouter({
    routeTree: createRootRoute({
      component: () => <QueryClientProvider client={queryClient}>{page}</QueryClientProvider>,
    }),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()
  render(<RouterProvider router={router} />)
}
