# 010.2: Per-user locale

Status: done
Depends on: task 010.1 (the locale cookie this keeps in step)

## Acceptance criteria

- [x] A migration adds the user's locale (`et` or `en`, null until chosen); `schema.ts`
      maps it; `db:drift` reports no changes.
- [x] A language switch saves the choice on the user and in the cookie.
- [x] After sign-in, a saved locale replaces the cookie's, so the choice follows the user
      to another browser.
- [x] Tests cover saving the locale and applying it at sign-in.
