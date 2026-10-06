# 034.2: Notice and confirmation

Status: todo
Depends on: task 030 (the profile page)

## Acceptance criteria

- [ ] A member with an open request sees a notice with the admin's message when they open
      the app, which leads to their profile (`profile.html` state `request`).
- [ ] The profile has a "My profile is current" action: it sets `confirmed_at` and closes
      the open request as confirmed (`confirmed` state). It works without a request too.
- [ ] The profile shows the last confirmation, or that it was never confirmed (`none`
      state).

## Spec changes

- Modified: `docs/specs/profile-update-requests.md`, adding requirements:
  - The employee sees the request: `profile-update-requests.notice-shown`.
  - Confirming closes it: `profile-update-requests.confirmed`,
    `profile-update-requests.confirmed-without-request`.
