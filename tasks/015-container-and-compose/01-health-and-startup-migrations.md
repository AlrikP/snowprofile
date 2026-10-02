# 015.1: Health endpoint and startup migrations

Status: todo

## Acceptance criteria

- [ ] A health endpoint answers when the app can serve requests and reach the database.
- [ ] With `MIGRATE_ON_START=true`, the server entry verifies and applies migrations
      before it listens; a failed migration stops it from listening.
- [ ] Tests or a documented manual check cover both.
