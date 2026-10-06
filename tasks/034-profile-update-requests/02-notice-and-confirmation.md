# 034.2: Notice and confirmation

Status: done
Depends on: task 030 (the profile page)

## Acceptance criteria

- [x] A member with an open request sees a notice with the admin's message when they open
      the app, which leads to their profile (`profile.html` state `request`).
- [x] The profile has a "My profile is current" action: it sets `confirmed_at` and closes
      the open request as confirmed (`confirmed` state). It works without a request too.
- [x] The profile shows the last confirmation, or that it was never confirmed (`none`
      state).

## Spec changes

- Modified: `docs/specs/profile-update-requests.md`, adding requirements:
  - The employee sees the request: `profile-update-requests.notice-shown`.
  - Confirming closes it: `profile-update-requests.confirmed`,
    `profile-update-requests.confirmed-without-request`.

## Outcome

- The notice shows in two places: on the profile, which the app opens on, with who asked,
  when, and the message, and the confirm button inside; and on every other page as a
  banner in the frame that links to the profile. For the banner, each membership in the
  frame carries `updateRequested`, and confirming reloads the router so it goes away.
- `confirmProfile` sets `confirmed_at` and closes the open request as `confirmed` in one
  transaction. Without a request it just records the confirmation; a member without a
  profile gets one.
- After confirming, the page shows the prototype's "Thanks! Your profile is confirmed."
  until it is left.
- An e2e test has the admin request an update from Erik, Erik follow the banner, confirm,
  and the request leave the People page.
- Checked in a browser against `prototypes/profile.html` (state `request`) and the frame
  banner. `bun run test:e2e` passes, 18 tests.
