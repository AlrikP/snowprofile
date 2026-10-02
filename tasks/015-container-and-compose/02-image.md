# 015.2: Container image

Status: todo
Depends on: task 015.1 (the health check and startup migrations the image uses)

## Acceptance criteria

- [ ] The image layout (compiled Bun binary or Bun runtime image) is decided from image
      size and build time; the open question in `architecture.md` is closed.
- [ ] A multi-stage `Dockerfile` builds the app and a Caddy image with the static files;
      `.dockerignore` keeps secrets and local databases out.
- [ ] The app runs as a non-root user, logs to standard output, and keeps its database on
      `/data`.
