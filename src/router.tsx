import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { RouteError } from '#/components/route-error'
import { getContext } from '#/integrations/tanstack-query/root-provider'
import { reloadOnForbidden } from '#/lib/forbidden-reload'
import { routeTree } from '#/routeTree.gen'

export function getRouter() {
  const context = getContext()

  const router = createTanStackRouter({
    routeTree,
    context,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: RouteError,
  })

  setupRouterSsrQueryIntegration({ router, queryClient: context.queryClient })
  reloadOnForbidden(context.queryClient, () => router.invalidate())

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
