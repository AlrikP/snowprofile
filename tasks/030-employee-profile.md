# 030: Employee profile

Status: todo
Depends on: task 025 (period and bilingual inputs)

The "My profile" page with its personal details and education. It lays out the page's
sections; participations (task 031), own projects (task 033), and the update request
notice (task 034.2) fill theirs.

Builds on: `docs/product.md` ("Employee profile", "Personal data and GDPR");
`prototypes/profile.html` (states `personal`, `education`, `empty`); tables
`employee_profile`, `education`.

## Acceptance criteria

- [ ] A member edits their own full name, join date, and optional birth date. The birth
      date is labelled as shown only to admins and the person.
- [ ] A member adds, edits, and deletes education entries: institution, field, and degree
      (ET/EN), and an optional period. Entries list newest first.
- [ ] Nobody edits another person's profile through these functions; the check is on the
      session's user, not on input.
- [ ] No field accepts a personal ID code: the form has none, and the schema has no column
      for one.
- [ ] Each save records who changed the profile and when.
- [ ] The route renders `ProfilePage`, with `ProfilePending`; the `empty` state shows a new
      profile.

## Spec changes

- Added: `docs/specs/employee-profile.md`, with requirements:
  - A member keeps their own details: `employee-profile.details-saved`,
    `employee-profile.other-profile-refused`.
  - Birth date is private: `employee-profile.birth-date-optional`,
    `employee-profile.birth-date-hidden-from-employees`.
  - Education entries: `employee-profile.education-added`,
    `employee-profile.education-deleted`.
