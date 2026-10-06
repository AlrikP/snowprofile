# 030: Employee profile

Status: done
Depends on: task 025 (period and bilingual inputs)

The "My profile" page with its personal details and education. It lays out the page's
sections; participations (task 031), own projects (task 033), and the update request
notice (task 034.2) fill theirs.

Builds on: `docs/product.md` ("Employee profile", "Personal data and GDPR");
`prototypes/profile.html` (states `personal`, `education`, `empty`); tables
`employee_profile`, `education`.

## Acceptance criteria

- [x] A member edits their own full name, join date, and optional birth date. The birth
      date is labelled as shown only to admins and the person.
- [x] A member adds, edits, and deletes education entries: institution, field, and degree
      (ET/EN), and an optional period. Entries list newest first.
- [x] Nobody edits another person's profile through these functions; the check is on the
      session's user, not on input.
- [x] No field accepts a personal ID code: the form has none, and the schema has no column
      for one.
- [x] Each save records who changed the profile and when.
- [x] The route renders `ProfilePage`, with `ProfilePending`; the `empty` state shows a new
      profile.

## Spec changes

- Added: `docs/specs/employee-profile.md`, with requirements:
  - A member keeps their own details: `employee-profile.details-saved`,
    `employee-profile.other-profile-refused`.
  - Birth date is private: `employee-profile.birth-date-optional`,
    `employee-profile.birth-date-hidden-from-employees`.
  - Education entries: `employee-profile.education-added`,
    `employee-profile.education-deleted`.

## Outcome

- The profile functions take no profile ID: each works on the session user's profile in
  the call's organization, and Valibot drops any other key, so a `profileId` or a
  personal ID code in the input is ignored.
- A member can have no profile (a seeded Rabasaare member has none, and invitations create
  them only from task 028.2). The page then shows an empty profile named after the
  account, and the first save of details or education creates it. The server generates
  that profile's ID, since the client never sees an unsaved profile.
- Education changes also set the profile's `updated_at` and `updated_by`, so "last
  changed" covers the whole profile. The page doesn't show it; task 034 decides what the
  profile header shows.
- `employee-profile.birth-date-hidden-from-employees` is tested on the project page, the
  only response that shows other people's profiles to employees today. Tasks 034 (People)
  and 035 (search), which show profiles to admins, should cite it again.
- New shared pieces: `CalendarDate` and `OptionalPeriod` in `src/server/schemas.ts`, and
  `formatDate` in `src/lib/date-time.ts`, which formats a calendar date in UTC so it never
  shifts by a day.
- Education uses the shared `PeriodInput` with an optional start, instead of the
  prototype's two MM-YYYY text fields, so every period in the app is entered the same way.
- The page has only its left column until tasks 031.2 and 033 add participations and own
  projects on the right.
- Checked in a browser against `prototypes/profile.html` (states `personal`, `education`):
  the page and both dialogs. `bun run test:e2e` passes, 14 tests.
