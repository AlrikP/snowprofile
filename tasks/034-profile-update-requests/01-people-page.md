# 034.1: People page

Status: done
Depends on: task 028.1 (`members-and-roles.md`, which the leaver requirement extends)

From task 028.2: a leaver who accepts a new invitation is current again; acceptance
clears `left_date` (decided 2026-10-06, `docs/product.md`, "Leavers").

## Acceptance criteria

- [x] Admins see the people with their participation count, last confirmation (marked
      when older than 6 months or never), and open request. Leavers are hidden unless
      "Show leavers" is ticked (`people.html` states `list`, `leavers`).
- [x] An admin requests an update from one person or from everyone without an open
      request, with an optional message, and cancels an open request (`request`,
      `request-all` states).
- [x] An admin marks a person as left with a date: one transaction sets `left_date`,
      removes the membership, and cancels an open request; the profile and its
      participations stay (`leave` state; decided 2026-10-06). The last admin can't be
      marked as left.
- [x] The route renders `PeoplePage`, with `PeoplePending`.

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
    `members-and-roles.leaver-profile-kept`, `members-and-roles.leavers-hidden`,
    `members-and-roles.rejoin-clears-leave`.

## Outcome

- The page lists profiles, not members, so leavers (who have no membership) show when
  "Show leavers" is ticked. A member who has never saved a profile doesn't appear until
  they do.
- Permissions: the list needs `profile: ['readAll']`, requests and cancelling
  `profile: ['requestUpdate']`, and marking a leaver `member: ['delete']`, since it ends
  the membership. The last-admin rule is the members page's: a member with
  `member: ['update']`.
- "Request from everyone" skips leavers and open requests, and reports how many it asked;
  the dialog shows that count before sending and is disabled at zero.
- Staleness (older than six months) is judged on the client against the page's time;
  never confirmed shows one "Never" badge.
- Asked and decided: rejoining clears the leaving date. Acceptance (task 028.2) now
  clears `left_date` when it keeps an existing profile; `docs/product.md` records it, and
  `members-and-roles.rejoin-clears-leave` covers it.
- The leaving date must not be before the join date (`profile_left_before_join`), as the
  database's check requires.
- Checked in a browser against `prototypes/people.html` (states `list`, `leavers`, and
  the row menu). `bun run test:e2e` passes, 17 tests.
