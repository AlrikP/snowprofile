# 015.3: Local Compose stack

Status: todo
Depends on: task 015.2 (the images)

## Acceptance criteria

- [ ] `deploy/compose/compose.yml` and a Caddyfile run Caddy in front of the app; only
      Caddy publishes ports; the database is on a named volume chosen by an env variable.
- [ ] The stack starts locally with `DEMO_MODE`, migrates a fresh volume on start, and
      can be seeded with a temporary container using the app image.
- [ ] `docs/deployment.md` describes the local rehearsal; `AGENTS.md` lists it under
      "Project context".
