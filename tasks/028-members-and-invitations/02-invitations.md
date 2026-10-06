# 028.2: Invitations

Status: done
Depends on: task 028.1 (the members page)

No email in the MVP: the admin copies the invitation link and sends it.

## Acceptance criteria

- [x] An admin invites an email address with a role and gets a link to copy (`invite`
      and `link` states). Inviting a current member or an address with a pending
      invitation is refused.
- [x] The page lists pending invitations with their expiry; an admin cancels one.
- [x] Signing in with the invited address accepts the invitation: the user becomes a
      member with the invited role, and an `employee_profile` is created with
      `full_name` from `user.name`, unless the user already has one in that organization
      (the sheet migration creates them, task 039.4). Opening the link signed out leads
      through sign-in and back.
- [x] A user without an invitation still lands on the "no access" page.
- [x] An expired or canceled invitation isn't accepted, and the page says so.
- [x] `docs/architecture.md` records how acceptance works (on the link, or on every sign-in
      for any pending invitation to that address) and which organization plugin
      endpoints the app uses, for task 021.

## Spec changes

- Modified: `docs/specs/members-and-roles.md`, adding requirements:
  - Admins invite by email: `members-and-roles.invite-link`,
    `members-and-roles.invite-member-refused`,
    `members-and-roles.invitation-canceled`.
  - Signing in accepts an invitation: `members-and-roles.invitation-accepted`,
    `members-and-roles.profile-created`, `members-and-roles.expired-refused`.
  - Invitation only: `members-and-roles.uninvited-no-access`.

## Outcome

- Acceptance is **on the link**, not on every sign-in (`docs/architecture.md`, "Roles").
  The link page gives the expired, canceled, and other-address cases a place to say so,
  and an uninvited user who signs in without a link still lands on "no access".
- Creating, listing, cancelling, and accepting are the app's own server functions in
  `src/server/invitations/`, so acceptance creates the member and the profile in one
  transaction. The plugin's seven invitation endpoints are closed over HTTP, like
  `update-member-role`, which leaves `set-active` as the only plugin endpoint the app
  calls. Task 021 builds on that list.
- Acceptance needs the invited address to match the user's, without case, and to be
  verified. Its repository functions take no scope, since the invitee isn't a member yet;
  the link's ID and the session's user decide what they reach, and the tenancy test says
  so.
- A link lasts seven days (Better Auth's default is 48 hours), since the admin sends it
  by hand. Emails are trimmed and lowercased on the way in.
- `/sign-in?redirect=<path>` returns there after sign-in, for password and Google
  sign-in; only paths on this site are followed.
- Left open: a leaver who is invited again keeps their profile, with its `left_date`
  still set, because acceptance keeps an existing profile as the criterion says. Whether
  rejoining clears `left_date` is for task 034.1, which marks leavers.
- Checked in a browser against `prototypes/members.html` (states `invite`, `link`) and a
  bad link. `bun run test:e2e` passes, 17 tests, including inviting Erik to Rabasaare,
  opening the link signed out, and signing in.
