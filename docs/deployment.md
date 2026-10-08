# Deployment

snowprofile runs as a Docker Compose stack: Caddy in front, and one app container with
its SQLite database on a named volume (`docs/hosting.md`). This page covers rehearsing the
stack locally and publishing a release. The Hetzner server and Litestream backups get
their own steps here when their tasks add them.

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

## Publish a release

The "Compose deploy" workflow (`.github/workflows/compose-deploy.yml`) builds both images
for `linux/amd64` and pushes them to GitHub Container Registry as
`ghcr.io/alrikp/snowprofile-app` and `ghcr.io/alrikp/snowprofile-caddy`. Both are tagged
with the commit's short ID, the release. It deploys nothing: a stack picks up a release
when its `.env` names it.

1. In the repository's Actions tab, open "Compose deploy", choose **Run workflow**, and
   pick the branch, usually `main`.
2. Read the release from the run's summary, for example `2870cce`.

CI builds the same images on every push and pull request without pushing them, and runs
the app image on an empty volume with the bundled seeder, so a broken image fails there
first.

To run a release, set it in the stack's `.env` and start the stack without building. The
packages are private unless made public on GitHub, so log in first with a personal access
token that can read packages:

```bash
echo "$TOKEN" | docker login ghcr.io -u <github-user> --password-stdin
# in deploy/compose/.env: RELEASE=2870cce
docker compose pull
docker compose up -d --no-build --wait
```

To roll back, set an earlier release and run the same commands. This works only back to
a release with the same migrations: on startup, a release that lacks a migration the
database already applied reports it as deleted and refuses to start (`db:verify`). On an
Apple Silicon Mac the `linux/amd64` images run under emulation, slower than a local
build. Set `RELEASE=local` to build from the checkout again.

## Create an organization

The company stack holds no demo data: the platform operator creates each organization
with a script, which also invites its first admin (`docs/product.md`, "Users and access").
Run it in a temporary container from the app image, with the app stopped, as for seeding:

```bash
docker compose stop app
docker compose run --rm --no-deps app bun --no-env-file .output/server/scripts/org-create.js \
  snowhound "Snowhound OÜ" admin@snowhound.eu
docker compose up -d --wait
```

It prints an invitation link on `APP_HOST`, valid for 7 days. Send it to the admin, who
opens it signed in with that address and then invites the employees from the members
page. Running it again for the same slug changes nothing. Locally,
`bun run org:create <slug> <name> <email>` does the same against `DATABASE_URL`.

## Load the CV sheet

Snowhound's data comes from its CV sheet, loaded once into the organization created above
(`docs/architecture.md`, "From the sheet"). The sheet holds personal data, so it stays
outside the repository and the image: mount it into the temporary container read-only,
with the app stopped.

```bash
bun run sheet:report Snowhound_CV_baas.xlsx    # locally first: what the migration can't read
docker compose stop app
docker compose run --rm --no-deps -v "$PWD/Snowhound_CV_baas.xlsx:/sheet.xlsx:ro" app \
  bun --no-env-file .output/server/scripts/sheet-migrate.js /sheet.xlsx snowhound
docker compose up -d --wait
```

It loads everything in one transaction and prints what it loaded and the values it
couldn't read, for an admin to fix in the app. Each imported employee gets a pending
invitation, valid for 7 days: the admin copies the links from the members page and sends
them, and each employee signs in with Google at their company address to find their
profile. Running it again updates what it loaded
instead of duplicating it, so rehearse it on a local Compose stack first. Locally,
`bun run sheet:migrate <file> <slug>` does the same against `DATABASE_URL`.
