# 034.1: People page

Status: todo
Depends on: task 028.1 (`members-and-roles.md`, which the leaver requirement extends)

## Acceptance criteria

- [ ] Admins see the people with their participation count, last confirmation (marked
      when older than 6 months or never), and open request. Leavers are hidden unless
      "Show leavers" is ticked (`people.html` states `list`, `leavers`).
- [ ] An admin requests an update from one person or from everyone without an open
      request, with an optional message, and cancels an open request (`request`,
      `request-all` states).
- [ ] An admin marks a person as left with a date: one transaction sets `left_date`,
      removes the membership, and cancels an open request; the profile and its
      participations stay (`leave` state; decided 2026-10-06). The last admin can't be
      marked as left.
- [ ] The route renders `PeoplePage`, with `PeoplePending`.

## Spec changes

- Added: `docs/specs/profile-update-requests.md`, with requirements:
  - Admins see confirmations: `profile-update-requests.last-confirmation-shown`,
    `profile-update-requests.stale-marked`.
  - Admins request updates: `profile-update-requests.requested`,
    `profile-update-requests.one-open-request`,
    `profile-update-requests.request-all-skips-open`,
    `profile-update-requests.canceled`,
    `profile-update-requests.employee-cannot-request`.
- Modified: `docs/specs/members-and-roles.md`, adding a requirement:
  - Marking a leaver ends access: `members-and-roles.leaver-loses-access`,
    `members-and-roles.leaver-profile-kept`, `members-and-roles.leavers-hidden`.
