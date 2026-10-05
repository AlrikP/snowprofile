# Hosting

Goal: run on one Hetzner server in an EU data center, as a Docker Compose stack, at a
flat low cost, with all data in the EU. Until the first deployment, everything runs
locally. Setup steps, starting with the local rehearsal, are in `docs/deployment.md`.

snowtime's Compose deployment, which runs `snowtime-internal.snowhound.eu` on Hetzner, is
the reference: `../snowtime/docs/deployment/compose.md`, `../snowtime/deploy/compose/`,
and `../snowtime/docs/hosting.md` ("Self-hosted").

## Hetzner

- Snowhound already runs servers there; the cost is flat; commercial use is allowed.
- The server is in one EU location, so users far from it wait longer on every page.
- **Sizing (from snowtime):** the app peaked near 400 MB under load. The minimum is
  1 vCPU and 2 GB; 2 vCPU and 4 GB leave a core for Caddy, Litestream, and the OS.
- The Hetzner firewall, not UFW, controls the ports. Only Caddy publishes ports.

## SQLite in the app process

- **One app process per database.** No second instance or zero-downtime handover; a
  restart pauses requests for about a second while Caddy holds them.
- **Vertical scaling only.** A bigger server is the way up, which is ample for this app's
  data volume.
- **Large migrations stop the app.** A migration that rewrites a large table runs with
  the app stopped, because another process holding the write lock for more than 5 seconds
  makes the app's writes fail.
- The database lives on the app container's named volume. Never run
  `docker compose down -v`: it deletes the database.

## Litestream

- Streams every change to off-site S3-compatible storage, with point-in-time restore.
  The bucket belongs in another location or with another provider than the server.
- A demo stack can run without it. The company stack can't go live without it.

## Cloudflare

- Cloudflare's proxy sits in front of Caddy and caches only static assets; HTML,
  authentication, and server functions bypass the cache.
- Caddy trusts Cloudflare's address list, which must be kept current.

## Implications for design

- One app process: in-memory state such as rate-limit counts is correct, but a restart
  resets it. No other state may need to survive a restart, apart from the SQLite file.
- Configuration comes only from environment variables, including the database URL, so
  the same image runs on any host.
- No background workers outside the app process; compute on request.
- A demo stack and the company stack never share a database.
- **Operator duties once deployed:** Litestream backups with periodic test restores, OS
  updates, keeping Caddy, Litestream, and Cloudflare's address list current, watching
  disk space, and server hardening. Each becomes a task when deployment starts.
