# Deployment

snowprofile runs as a Docker Compose stack: Caddy in front, and one app container with
its SQLite database on a named volume (`docs/hosting.md`). This page covers rehearsing the
stack locally. The Hetzner server, the deploy workflow, and Litestream backups get their
own steps here when their tasks add them.

## The stack

| Piece                        | What it does                                                                                                           |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `Dockerfile`, target `app`   | The production build on the Bun runtime image, as the non-root `bun` user, with the database at `/data/snowprofile.db` |
| `Dockerfile`, target `caddy` | Caddy with the static files and `deploy/compose/Caddyfile`                                                             |
| `deploy/compose/compose.yml` | Runs both. Only Caddy publishes ports; the app is reachable only from Caddy                                            |
| `deploy/compose/.env`        | The stack's settings, copied from `.env.example`. Git ignores it                                                       |

On start, the app verifies and applies pending migrations before it listens
(`MIGRATE_ON_START`), so a fresh volume gets its tables and a failed migration keeps the
app down. Caddy starts once the app's health check (`/api/health`) passes.

Caddy sets the `CF-Connecting-IP` header from the client address it trusts: Cloudflare's
header for requests from Cloudflare's ranges, and the connection's address otherwise. The
app reads it (`CLIENT_IP_HEADER`), so Better Auth limits sign-in attempts per client
instead of for everyone at once.

## Rehearse locally

You need Docker with Compose. In `deploy/compose/`:

1. Copy the settings and fill in the secret:

   ```bash
   cp .env.example .env
   bunx --bun @better-auth/cli secret   # paste into BETTER_AUTH_SECRET
   ```

   The defaults run a demo stack on `https://localhost` with the volume
   `snowprofile_demo_data`. If ports 80 and 443 are taken on your machine, set
   `APP_HOST=localhost:8443`, `HTTP_PORT=8080`, and `HTTPS_PORT=8443`.

2. Build the images and start the stack:

   ```bash
   docker compose up -d --build
   ```

3. Seed the demo data with a temporary container from the app image, with the app
   stopped: one process writes to the database at a time. The seeder adds the demo
   organizations the database lacks, and prints how to sign in:

   ```bash
   docker compose stop app
   docker compose run --rm --no-deps app bun --no-env-file .output/server/scripts/db-seed.js
   docker compose up -d --wait
   ```

4. Open `https://localhost` (or `https://localhost:8443`). Caddy signs localhost with its
   own certificate authority, so the browser warns once; `curl` needs `-k`.

Useful while it runs:

- `docker compose logs -f app` shows the app's log; `caddy` shows the access log.
- The seed command with `--reset demo` starts one demo organization over; stop the app
  first, as for seeding.
- `docker compose down` stops the stack and keeps the database volume.

Never run `docker compose down -v`: it deletes the database volume. To start a local
rehearsal over from an empty database, stop the stack and remove that one volume by name:
`docker volume rm snowprofile_demo_data`.

A demo stack and the company stack never share a database volume, and `DEMO_MODE` and
`ALLOWED_LOGIN_DOMAINS` are never on together; the app refuses to start with both.
