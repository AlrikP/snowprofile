import { createFileRoute } from '@tanstack/react-router'
import { db } from '#/db'
import { databaseReachable } from '#/db/health'

// For the container's health check and Caddy: 200 when the app serves requests and
// reaches its database, 503 when the database doesn't answer.
export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: async () => {
        const ok = await databaseReachable(db)
        return Response.json(
          { status: ok ? 'ok' : 'unavailable' },
          { status: ok ? 200 : 503, headers: { 'cache-control': 'no-store' } },
        )
      },
    },
  },
})
