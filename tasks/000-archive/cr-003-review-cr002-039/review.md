# CR-003 review: cr-002 through task 039.2

Reviewed 2026-10-07. A snapshot of `d1cf192`; the subtasks track the fixes.

## Summary

- **Range:** `0034e9e..d1cf192`, from "Add task cr-002 with fixes from the review of
  cr-001 through task 026" (`90f9954`) to "Add the cr-review skill for periodic code
  reviews" (`d1cf192`). It holds cr-002.1–.5 and tasks 027, 028.1–.2, 029.1–.4, 030,
  031.2–.3, 032, 033, 034.1–.2, 035, 036.1–.2, 037, 038, and 039.1–.2. No migrations.
- **Checks:** `check`, `test` (512 server and 165 component tests), `specs:check` (153
  scenarios in 17 specs), `db:drift`, `db:verify`, `datamodel:check`, `build`,
  `build:scripts`, `prototypes:build`, and `test:e2e` (21 tests) pass. `bun install`,
  `check`, and `test` pass in a clean `git archive` export of `d1cf192`.
  `.github/workflows/ci.yml`, `lefthook.yml`, and the "Running things" table match
  `AGENTS.md` and `package.json`.
- **cr-002 verification:** 18 criteria verified, none partly met, regressed, or unmet.
- **Assessment:** the new features are scoped and checked carefully. Every repository
  filters by the scope's organization and has isolation cases. Every ID from the client is
  checked against the organization, and permissions are checked in the rules. Tender
  details, contacts, and birth dates are left out of responses, not only hidden. The gap
  is at the edge: Better Auth's organization plugin still answers most of its own HTTP
  endpoints, which skip the app's rules.

Top risks:

1. Employees read every member's email and the pending invitations, with their link IDs,
   through the plugin's `list-members` and `get-full-organization`; the members spec says
   the server refuses them the list.
2. Any employee sees a project's tender details and contacts by adding a participation to
   it, because participation is self-declared.
3. The sheet parser accepts years up to 2100, so `03.21` loads as March 2100 instead of
   going to the report.

## Risk map

| Area                                                                      | Risk   | Why                                                                                                                            |
| ------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Better Auth organization plugin endpoints (`sign-in.server.ts`)           | High   | Only role and invitation paths are closed; the rest bypass `members.server.ts` and `people.server.ts`                          |
| Members, roles, leavers (`members/`, `people.server.ts`)                  | High   | Role changes, last-admin rule, leaver transaction; `scopeMiddleware`, `member: ['update']` and `['delete']`                    |
| Invitations (`invitations/`, `/invite/$invitationId`)                     | High   | Pre-membership flow on `sessionMiddleware`; unscoped lookup by link ID; email and verification check                           |
| `GET /api/cv-document`                                                    | High   | Server route outside the middleware: does its own session, membership, and `cv: ['generate']` checks; user text in a file name |
| Projects: tender details and contacts (`projects.server.ts`)              | High   | Third-party personal data; visibility decided per caller                                                                       |
| Own data: profile, education, participations, own projects                | High   | Ownership by session user, never input; birth date privacy                                                                     |
| Search and CV read (`search/`, `cvs/`)                                    | High   | Cross-table joins, period boundaries, leaver filter, client ID lists                                                           |
| Demo mode                                                                 | High   | New admin writes (role changes, leavers) affect shared accounts; tracked by task 021                                           |
| `scripts/org-create.ts`, `scripts/sheet-migration/`                       | Medium | Writes outside a request as `SYSTEM_USER_ID`; reads a file with real personal data                                             |
| CV copy (`cv-table.ts`) and DOCX (`cv-document.server.ts`)                | Medium | HTML built from user text; generated document                                                                                  |
| Catalogues and checklist (`roles/`, `criteria/`)                          | Medium | Merge moves links in a transaction; counts must skip deleted rows                                                              |
| Shared code: `forbidden-reload.ts`, `permissions.ts`, `session.server.ts` | Medium | `permissions.ts` gained no grants; `access` and `frame` moved from `auth.functions.ts` (cr-002.2)                              |
| Frontend pages and shared components                                      | Low    | Reviewed through component tests and the diff                                                                                  |
| Dependencies                                                              | Low    | `docx` 9.8.1, `read-excel-file` 9.3.10 pinned; `jszip`, `write-excel-file` dev only; `docx` stays out of the client bundle     |

Removed code: `src/components/page-placeholder.tsx` and `src/routes/$organization/projects.tsx`
(replaced by real pages), `bilingual_one_required` (cr-002.4, re-added by task 027), and
`signedIn` in `auth.functions.ts` (moved, cr-002.2). Each has its reason in the commit or
task. No scope condition, permission check, demo refusal, or test was removed or skipped.
No inline lint disables, and no new environment variables.

## cr-002 verification

| Criterion                                                              | Result   | Evidence                                                                           |
| ---------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------- |
| 1: `/revoke-session` and `/list-sessions` refused in demo mode         | Verified | `sign-in.server.ts:23`; `better-auth.test.ts:148` passes                           |
| 1: both stay open outside demo mode; `/sign-out` open in every mode    | Verified | `better-auth.test.ts:165`                                                          |
| 1: `sign-in.demo-accounts-locked` checks every disabled path           | Verified | `better-auth.test.ts:155` loops over `disabledPaths`                               |
| 2: oxlint refuses `#/db`, `#/db/connection`, `#/env` in client code    | Verified | `.oxlintrc.json:46` and the routes override; `AGENTS.md` names them                |
| 2: `imports:check` requires the shortest relative path                 | Verified | `scripts/imports-check.ts`; its test passes                                        |
| 2: `specs:check` ignores skipped, todo, and commented-out tests        | Verified | `scripts/specs-check.ts`; `specs-check.test.ts` passes                             |
| 2: `signedIn` moves into a `*.server.ts` rule                          | Verified | `src/server/auth/session.server.ts`; `auth.functions.ts` only wires                |
| 3: role migration test applies only earlier migrations                 | Verified | `src/db/roles.test.ts:109` uses `migrationsUpTo`                                   |
| 3: `grouped-by-category` checks exact counts                           | Verified | `technologies.test.ts:112` expects 1 project and 2 people                          |
| 3: e2e opens `/demo/technologies` and adds an entry                    | Verified | `e2e/smoke.e2e.ts:155` passes                                                      |
| 4: close button labelled in the UI language                            | Verified | `dialog.tsx:66`, `:101`, `sheet.tsx:74` use `m.action_close()`                     |
| 4: English merge text for a count of 1                                 | Verified | `messages/en.json:108` has variants; `messages.test.ts:23` passes                  |
| 4: duplicate warning tied with `aria-describedby`                      | Verified | `add-technology-dialog.tsx:76`, `edit-technology-dialog.tsx:68`                    |
| 4: `bilingual_one_required` used or removed                            | Verified | Used by `criterion-dialog.tsx:65` and `education-dialog.tsx:154`                   |
| 5: `AGENTS.md` check row and hook description                          | Verified | `AGENTS.md` names `specs:check` and `datamodel:check`, as `lefthook.yml` runs them |
| 5: `docs/migrations.md` exception until the first deployment           | Verified | "Backward compatible" names `20261006074311_role_catalogue`                        |
| 5: architecture lists roles as soft-deleted and their `merged_into_id` | Verified | `docs/architecture.md`, "Audit and deletion"                                       |
| 5: task 026's picker criterion names the category per option           | Verified | `tasks/026-technology-catalogue.md:26`                                             |

The follow-up cr-002 named, running the bundled scripts in CI, is a criterion of task 024.
cr-002 isn't archived yet; nothing builds on its file once this review records the range,
so subtask 4 moves it.

## Findings

### 1. The plugin's organization endpoints bypass the members rules

- **Severity:** high
- **Area:** Tenancy and authorization; task 028.1 (members), 034.1 (leavers)
- **Location:** `src/server/auth/sign-in.server.ts:43`
- **What's wrong:** `replacedPaths` closes only the plugin's role and invitation
  endpoints. The others stay open over HTTP in every mode, and each skips a rule the app
  enforces:
  - `GET /organization/list-members` and `GET /organization/get-full-organization` need
    only membership. An employee gets every member's name, email, and role, and the
    pending invitations with their invitees' emails and IDs, which are the link secrets.
    `members-and-roles.employee-refused` says the server must refuse them the list.
  - `POST /organization/remove-member` (admins) and `POST /organization/leave` (anyone)
    end a membership without the leaver transaction: no `left_date`, and the open update
    request stays. The person then shows as current on the People page, in search, and in
    the CV picker, without access (`members-and-roles.leaver-loses-access`).
  - `POST /organization/update` lets an admin change the organization's name and slug,
    which nothing in the product offers. A new slug moves every URL, and can take a
    reserved one, such as `api`, that `organizations.schemas.ts` refuses.
- **Failure scenario:** an employee signed in on the company stack opens
  `/api/auth/organization/get-full-organization?organizationId=<id>` and reads every
  colleague's email and every pending invitation link.
- **Evidence (confirmed):** a throwaway test in a scratch export, with `DEMO_MODE` off,
  printed:

  ```text
  remove-member 200
  leave 200
  update slug 200
  [{"fullName":"rv-emp","leftDate":null,"requestedAt":true,"canMarkLeft":true},
   {"fullName":"rv-emp2","leftDate":null,"requestedAt":true,"canMarkLeft":true}]
  org renamed Renamed
  list-members 200 ["rv2-admin@example.com","rv2-emp@example.com"]
  get-full-organization 200 "invitations":[{"email":"pending-person@example.com","role":"admin",...,"id":"01a11578-12e0-..."}]
  ```

  Better Auth itself keeps the last admin (its `creatorRole` check), so only the app's
  leaver rule and the read refusals are bypassed.

- **Suggested fix:** close every `/organization/*` endpoint except `/organization/set-active`,
  the only one the app calls over HTTP (`src/routes/$organization/route.tsx:34`), by
  deriving the list from `auth.api` so a plugin upgrade's new endpoints are closed too.
  Extend the test at `better-auth.test.ts:181` to every such path, and update
  `docs/architecture.md`, "Roles".

### 2. Adding a participation reveals a project's tender details

- **Severity:** medium
- **Area:** Tenancy and authorization; task 029.1, 031.2
- **Location:** `src/server/projects/projects.server.ts:82`,
  `src/server/profiles/participations.server.ts:67`
- **What's wrong:** tender details (cost, hours, tender reference, and contact persons
  with email and phone) show to anyone with a participation on the project. Any member can
  add a participation to any live project from their profile, so the check stops casual
  browsing only. `docs/product.md`, "Visibility", and `projects.details-hidden` read as
  an access rule for third-party personal data.
- **Failure scenario:** an employee adds a participation to a project they never worked
  on, opens the project, reads its contacts' emails and phones, and deletes the
  participation.
- **Evidence (traced):** `participationValues` checks only that the project is live;
  `projectView` grants details when any of the project's participations is the caller's.
- **Suggested fix:** a product decision, so it goes to follow-up task 043 rather than a
  cr-003 subtask.

### 3. The sheet parser accepts years up to 2100

- **Severity:** low
- **Area:** Input, output, and personal data; task 039.2
- **Location:** `scripts/sheet-migration/parse.ts:31`, `:58`
- **What's wrong:** `LAST_YEAR` is 2100, and a dotted month pads its year with zeros
  (so `10.202` reads as 2020). Together they read `03.21` as March 2100 and `03.20` as
  March 2000, without a report line. The spec requires every value the script can't read
  to be reported (`sheet-migration.unparsed-reported`).
- **Failure scenario:** a participation written `05.2020` to `03.21` loads as running to
  March 2100 once task 039.4 loads participations, and the report doesn't mention it.
- **Evidence (confirmed):** in the scratch export, `parsePeriodDate('03.21')` returned
  `{"ok":true,"value":"2100-03"}`, and `parsePeriod('05.2020', '03.21')` returned
  `endDate: "2100-03"`.
- **Suggested fix:** refuse years after the current one, which a historical sheet can't
  hold, so a padded or mistyped year goes to the report.

### 4. The sheet file isn't ignored by git

- **Severity:** low
- **Area:** Input, output, and personal data; task 039.2
- **Location:** `.gitignore`
- **What's wrong:** task 039 says the sheet never enters the repository, but nothing
  ignores `*.xlsx`. Downloaded CVs (`*.docx`) hold personal data too.
- **Failure scenario:** the operator copies `Snowhound_CV_baas.xlsx` into the working tree
  to run `bun run sheet:report`, and a later `git add -A` commits it.
- **Evidence (traced):** `.gitignore` has no spreadsheet or document pattern. The history
  holds no such file.
- **Suggested fix:** ignore `*.xlsx` and `*.docx` in `.gitignore`.

### 5. A missing project shows the router's English error

- **Severity:** low
- **Area:** Frontend; task 029.1
- **Location:** `src/routes/$organization/projects.$projectId.tsx:12`, `src/router.tsx:10`
- **What's wrong:** no route and no router default sets an error component. When the
  project read answers `NOT_FOUND`, TanStack Router renders its own "Something went
  wrong!" with a "Show Error" button, in English in both UI languages.
  `projects.deleted-hidden` says the page is not found.
- **Failure scenario:** a member follows a link to a project an admin deleted, and sees
  "Something went wrong!" in the frame instead of a translated "Project not found".
- **Evidence (traced):** `grep -rn "errorComponent\|notFoundComponent" src` finds
  nothing; `@tanstack/react-router` falls back to `ErrorComponent`
  (`CatchBoundary.js:56`).
- **Suggested fix:** give the router a translated `defaultErrorComponent` that shows a
  not-found message for `NOT_FOUND` and the error code's message otherwise.

### 6. UI text and the invitation copy button

- **Severity:** low
- **Area:** i18n and Frontend; task 028.2, 035
- **Location:** `src/features/members/invite-dialog.tsx:135`, `:44`;
  `src/components/period-filter.tsx:41`
- **What's wrong:** the invite form's placeholder `nimi@example.com` is Estonian in the
  English UI, and the period filter's `MM-YYYY` is English in the Estonian UI. The
  invitation's copy button awaits `navigator.clipboard.writeText` without a `catch`, so a
  refused clipboard gives no feedback and an unhandled rejection; the CV copy handles the
  same failure (`cv-view.tsx:68`).
- **Failure scenario:** in a browser that refuses clipboard access, an admin clicks
  "Copy" and nothing happens.
- **Evidence (traced):** the quoted lines.
- **Suggested fix:** translate both placeholders, and show a failure message from the
  copy button, as the CV view does.

## Doc drift

- `docs/architecture.md:378` says `build:scripts` bundles the start script and the
  seeder; it also bundles `org-create.ts` since task 039.1. The doc is behind.
- `tasks/040-specs-for-built-capabilities.md:6` and `:25` say Organizations has no spec
  and that the task adds `docs/specs/organizations.md`; task 039.1 created it. The task
  is behind.
- `docs/product.md:39` names the category "Infra"; the code and
  `organizations.created-by-script` say "Infrastructure". The product doc is behind.
- `docs/architecture.md`, "Roles" (`:308`–`:313`), describes the closed plugin endpoints;
  subtask 1 updates it with the fix.

## Open manual checks

- Task 037: paste a personal and a team CV into Word, Google Docs, and a spreadsheet, and
  record the result in the Outcome.
- Task 038: open a generated DOCX in Word and Google Docs. The test that opens the file
  and checks its text exists (`src/server/cvs/cv-document.test.ts`).
- Task 039: the rehearsal on a copy of the sheet waits for subtasks 039.3 and 039.4.

## Outside the range

None found.

## Unverified

None.

## Coverage

- Frontend components were reviewed through their tests and the diff, not in a browser:
  phone width, keyboard use, and focus in the new dialogs weren't checked by hand.
- The DOCX wasn't opened in Word; the CV copy wasn't pasted anywhere.
- The sheet parser was checked against its tests and a few probes, not the real sheet.
- Demo mode's new admin writes (role changes and leavers through the app's own server
  functions) weren't reported again: task 021 covers them, and its third criterion names
  the outcome.
- Plans reviewed: 039.3, 039.4, 040, 041, and 042. Only 040 disagrees with the code (doc
  drift above).

## Follow-up tasks

- `043-tender-details-for-participants.md`: decide who counts as a project's participant
  for its tender details, since participation is self-declared (finding 2). Options
  include accepting it and saying so in `docs/product.md`, details only through a
  participation an admin confirmed, or contacts for admins only.

Findings 1 and 3–6 and the doc drift go to cr-003's subtasks.
