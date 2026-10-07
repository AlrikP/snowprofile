# CR-003.1: Plugin organization endpoints

Status: todo

Better Auth's organization plugin answers only the endpoints the app calls, so no HTTP
request skips the members, invitation, and leaver rules (`review.md`, finding 1).

## Acceptance criteria

- [ ] Every `/organization/*` endpoint except `/organization/set-active` returns 404 over
      HTTP, in every mode, and the list comes from the plugin's endpoints, so one a Better
      Auth upgrade adds is closed too. Today `replacedPaths`
      (`src/server/auth/sign-in.server.ts:43`) closes only the role and invitation paths:
      an employee's `GET /organization/get-full-organization` returns 200 with every
      member's email and the pending invitations' IDs, and `remove-member`, `leave`, and
      `update` return 200, leaving the removed person without a `left_date`.
- [ ] The test at `src/server/auth/better-auth.test.ts:181` checks every closed
      organization path, including `list-members`, `get-full-organization`,
      `remove-member`, `leave`, and `update`, and that `set-active` still works.
- [ ] `docs/architecture.md`, "Roles", says that only `set-active` stays open, and why.
      Today it names only `update-member-role` and the invitation endpoints as closed
      (`docs/architecture.md:308`).
