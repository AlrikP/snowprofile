# 024: Compose deploy workflow

Status: done
Depends on: task 015 (the images and the Compose stack)

CI doesn't build the container images, so a broken `Dockerfile` shows only when someone
builds it. `docs/architecture.md` ("Environments and deployment") records how releases
are made: a manual "Compose deploy" workflow pushes both images to GitHub Container
Registry, tagged with the commit's short ID. snowtime's
`.github/workflows/compose-deploy.yml` is the reference. Restarting the stack on a server
belongs to the task that sets up the Hetzner server.

## Acceptance criteria

- [x] The CI `check` job builds both `Dockerfile` targets (`app` and `caddy`) without
      pushing, with the GitHub Actions build cache, so a broken image fails the pull
      request. `AGENTS.md` lists the step with the others.
- [x] The same job runs the built `app` image on an empty volume with
      `MIGRATE_ON_START=true`, waits for `/api/health`, and seeds it with the bundled
      `db-seed.js`. The e2e tests run `scripts/*.ts` from source, so today nothing in CI
      runs the bundled scripts the image starts with (task cr-002).
- [x] A "Compose deploy" workflow, started by hand from the Actions tab, builds both images
      for `linux/amd64` and pushes them to `ghcr.io/alrikp/snowprofile-app` and
      `ghcr.io/alrikp/snowprofile-caddy`, tagged with the commit's short ID.
- [x] `docs/deployment.md` describes publishing a release and running it with `RELEASE`
      set to its tag.

## Outcome

- CI's image steps run after the e2e tests: both targets build with the `gha` cache
  (shared with the deploy workflow), and the smoke test starts the app image on an empty
  volume, waits for `/api/health`, stops it, runs the bundled `db-seed.js`, and starts it
  again. The restart also runs startup's migration check on a database that has
  migrations. The job timeout went from 15 to 20 minutes for a cold image build.
- Verified locally with Docker 24: the app image builds in about 40 seconds, and the smoke
  steps pass on port 3199 (3000 was the dev server). The first `/api/health` poll gets an
  empty reply while the server starts, so the step retries quietly for up to 30 seconds.
- Neither workflow has run on GitHub yet: the first CI run checks the image steps there,
  and the first "Compose deploy" run creates both GHCR packages, private by default.
- Rolling back to a release with fewer migrations fails: `db:verify` at startup reports
  the newer migration as deleted. `docs/deployment.md` and `docs/architecture.md` now say
  so; whether to allow it went to task 052.
- Restarting a server after publishing stays with the Hetzner server task, as planned.
