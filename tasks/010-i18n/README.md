# 010: i18n

Status: in-progress

Estonian and English UI, switchable per user (`docs/product.md`, "Languages"). Estonian
is the base locale. The choice is kept in a cookie and on the user, so it follows them
across browsers.

## Subtasks

1. `01-paraglide.md`: Paraglide, the locale cookie, `<html lang>`, and the compile step.
2. `02-user-locale.md`: the per-user locale and the language switch.

## Acceptance criteria

- [ ] All subtasks are done.
- [x] Paraglide JS, installed by hand, with locales `et` and `en`; messages in
      `messages/`; compiled output gitignored and formatter-ignored.
- [x] The locale is kept in a cookie; whether it is also stored per user is decided and
      recorded, and the open question in `architecture.md` is closed.
- [x] The `<html lang>` attribute follows the locale.
- [x] The compile step runs before tests and builds, so a fresh clone works.
