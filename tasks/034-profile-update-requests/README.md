# 034: Profile update requests

Status: todo

Admins ask employees to bring their profiles up to date and see who has; employees see
the request when they sign in and confirm. The People page also marks leavers. The server
rule `requestProfileUpdate` exists from task 009.

Builds on: `docs/product.md` ("Profile update requests", "Leavers" under "Open
questions"); `docs/architecture.md` ("Audit and deletion": leavers);
`prototypes/people.html`, `profile.html` (states `request`, `none`, `confirmed`); tables
`employee_profile` (`confirmed_at`, `left_date`), `update_request`, `member`;
permission `profile: ['readAll', 'requestUpdate']`.

## Subtasks

1. `01-people-page.md`
2. `02-notice-and-confirmation.md`

## Acceptance criteria

- [ ] All subtasks are done.

Open, and not blocking: whether update requests need email soon after the MVP, and how
long a leaver's profile is kept (`docs/product.md`, "Open questions").
