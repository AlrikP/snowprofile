# 015.2: Container image

Status: done
Depends on: task 015.1 (the health check and startup migrations the image uses)

## Acceptance criteria

- [x] The image layout (compiled Bun binary or Bun runtime image) is decided from image
      size and build time; the open question in `architecture.md` is closed.
- [x] A multi-stage `Dockerfile` builds the app and a Caddy image with the static files;
      `.dockerignore` keeps secrets and local databases out.
- [x] The app runs as a non-root user, logs to standard output, and keeps its database on
      `/data`.

## Outcome

- Image layout: the Bun runtime image (`docs/architecture.md`, "Environments and
  deployment"). A compiled binary was estimated from its parts at about 10% smaller, but
  needs a libSQL patch and a build per CPU architecture.
- A production install still pulled in the build toolchain (661 MB). Bundling the scripts
  next to Nitro's traced output (`build:scripts`) removed `node_modules`: 216 MB.
- Docs, tasks, and prototypes are out of the build context, so editing them keeps the
  build cache.
- Verified by running the image: migration on a fresh volume, health, seeding through a
  temporary container, sign-in as the demo admin, and the non-root user.
- Open: behind a proxy, Better Auth can't see the client IP, so its rate limit is one
  shared bucket. Task 015.3 configures the forwarded address.
