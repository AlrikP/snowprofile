# 010.1: Paraglide and the locale cookie

Status: done

## Acceptance criteria

- [x] Paraglide JS, installed by hand, with locales `et` (base) and `en`; messages in
      `messages/`; compiled output in `src/paraglide/`, gitignored and formatter-ignored.
- [x] The locale comes from the cookie, then the browser's language, then Estonian; the
      server renders each request in its own locale.
- [x] The `<html lang>` attribute follows the locale.
- [x] The existing pages and the client's error messages use Paraglide messages in both
      languages.
- [x] `check`, `test`, and CI compile the messages first, and builds and the dev server
      compile through the Vite plugin, so a fresh clone works without install scripts.
- [x] `architecture.md` closes the locale storage question: a cookie and a per-user
      setting.
