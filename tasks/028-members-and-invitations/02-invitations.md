# 028.2: Invitations

Status: todo
Depends on: task 028.1 (the members page)

No email in the MVP: the admin copies the invitation link and sends it.

## Acceptance criteria

- [ ] An admin invites an email address with a role and gets a link to copy (`invite`
      and `link` states). Inviting a current member or an address with a pending
      invitation is refused.
- [ ] The page lists pending invitations with their expiry; an admin cancels one.
- [ ] Signing in with the invited address accepts the invitation: the user becomes a
      member with the invited role, and an `employee_profile` is created with
      `full_name` from `user.name`, unless the user already has one in that organization
      (the sheet migration creates them, task 039.4). Opening the link signed out leads
      through sign-in and back.
- [ ] A user without an invitation still lands on the "no access" page.
- [ ] An expired or canceled invitation isn't accepted, and the page says so.
- [ ] `docs/architecture.md` records how acceptance works (on the link, or on every sign-in
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
