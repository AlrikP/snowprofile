# 015.3: Local Compose stack

Status: done
Depends on: task 015.2 (the images)

## Acceptance criteria

- [x] `deploy/compose/compose.yml` and a Caddyfile run Caddy in front of the app; only
      Caddy publishes ports; the database is on a named volume chosen by an env variable.
- [x] The stack starts locally with `DEMO_MODE`, migrates a fresh volume on start, and
      can be seeded with a temporary container using the app image.
- [x] `docs/deployment.md` describes the local rehearsal; `AGENTS.md` lists it under
      "Project context".

## Outcome

- Behind Caddy, Better Auth couldn't see the client IP, so its sign-in rate limit was one
  bucket for everyone. Caddy now sets `CF-Connecting-IP` from the address it trusts, and
  the app reads it through the new `CLIENT_IP_HEADER` setting, as in snowtime.
- Dropped from snowtime's Caddyfile: the fallback Content-Security-Policy (our pages set
  none, so it would block the app) and precompressed files (our build makes none; Caddy
  compresses on the fly). Precompression can come back with a performance task.
- The published ports are settings, because ports 80 and 443 were taken on the
  development machine. A port in `APP_HOST` keeps Caddy's address and the app's public
  URL in step.
- Docker 24 doesn't know the healthcheck's `start_interval`, so the interval is 10
  seconds instead.
- Verified by running the stack on a throwaway volume: migration on start, seeding with
  a temporary container, the HTTP-to-HTTPS redirect, the security headers, sign-in
  through Caddy, and no client IP warning. The volumes, images, and `.env` were removed
  afterwards.
- Not covered: CI doesn't build the images, so a broken `Dockerfile` would show only when
  someone builds it. Task 024 adds the build to CI with the deploy workflow.
