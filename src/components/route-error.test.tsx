import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AppError } from '#/server/errors'
import { RouteError } from './route-error'

async function openFailingPage(error: unknown) {
  const rootRoute = createRootRoute()
  const page = createRoute({
    getParentRoute: () => rootRoute,
    path: '/demo/projects/$projectId',
    loader: () => {
      throw error
    },
    component: () => <p>Project</p>,
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([page]),
    history: createMemoryHistory({ initialEntries: ['/demo/projects/deleted'] }),
    defaultErrorComponent: RouteError,
  })
  await router.load()
  render(<RouterProvider router={router} />)
}

describe('RouteError', () => {
  it('projects.deleted-hidden: a deleted project’s page says it is not found', async () => {
    await openFailingPage(new AppError('NOT_FOUND', 'project_not_found'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Project not found.')
    expect(screen.queryByText('Project')).not.toBeInTheDocument()
  })

  it('shows a generic message, not internals, for an unexpected error', async () => {
    await openFailingPage(new Error('SQLITE_BUSY: database is locked'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Try again.')
  })
})
