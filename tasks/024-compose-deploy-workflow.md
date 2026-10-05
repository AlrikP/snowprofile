# 024: Compose deploy workflow

Status: todo
Depends on: task 015 (the images and the Compose stack)

CI doesn't build the container images, so a broken `Dockerfile` shows only when someone
builds it. `docs/architecture.md` ("Environments and deployment") records how releases
are made: a manual "Compose deploy" workflow pushes both images to GitHub Container
Registry, tagged with the commit's short ID. snowtime's
`.github/workflows/compose-deploy.yml` is the reference. Restarting the stack on a server
belongs to the task that sets up the Hetzner server.

## Acceptance criteria

- [ ] The CI `check` job builds both `Dockerfile` targets (`app` and `caddy`) without
      pushing, with the GitHub Actions build cache, so a broken image fails the pull
      request. `AGENTS.md` lists the step with the others.
- [ ] A "Compose deploy" workflow, started by hand from the Actions tab, builds both images
      for `linux/amd64` and pushes them to `ghcr.io/alrikp/snowprofile-app` and
      `ghcr.io/alrikp/snowprofile-caddy`, tagged with the commit's short ID.
- [ ] `docs/deployment.md` describes publishing a release and running it with `RELEASE`
      set to its tag.
