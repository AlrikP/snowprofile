# 020: Passkey sign-in

Status: todo
Depends on: task 006.3 (Google sign-in and the login domain check)

After the MVP. Let a signed-in user register a passkey and sign in with it later, as a
second sign-in method beside Google (`docs/product.md`, "Not in MVP"). Better Auth's
`@better-auth/passkey` plugin provides it; snowtime's setup is the reference.

## Acceptance criteria

- [ ] `docs/product.md` ("Users and access") lists passkeys as a sign-in method in
      deployed environments, and the "Not in MVP" entry is removed.
- [ ] The passkey plugin is enabled, with the relying party taken from `BETTER_AUTH_URL`,
      so each environment registers passkeys for its own domain.
- [ ] The `passkey` table comes from a migration with its `schema.ts` mapping, and the
      data model diagram shows it.
- [ ] A signed-in user registers, names, and deletes passkeys; the sign-in page offers
      passkey sign-in.
- [ ] Passkey sign-in passes the same `ALLOWED_LOGIN_DOMAINS` check as Google, and a test
      covers it.
