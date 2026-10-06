# Members and roles

Who belongs to an organization, and with which role. Admins see the members on the
members page and change their roles; the role decides what each member may do
(`docs/architecture.md`, "Roles").

## Requirements

### Requirement: Admins see the members

Admins must see the organization's members, each with name, email, role, and join date,
their own row marked. Members who can't manage the members must not open the page, and
the server must refuse them the list.

#### Scenario: members-and-roles.admin-lists

- **Given** an organization with several members
- **When** an admin opens the members page
- **Then** it lists every member with name, email, role, and join date, and marks the
  admin's own row

#### Scenario: members-and-roles.employee-refused

- **Given** an employee
- **When** they ask for the member list
- **Then** the server refuses

### Requirement: Admins change roles

An admin must be able to change a member's role between admin and employee. The server
must check the permission to manage members, not a role name, and refuse anyone without
it.

#### Scenario: members-and-roles.role-changed

- **Given** an admin and an employee
- **When** the admin makes the employee an admin, and back
- **Then** the employee's role changes each time

#### Scenario: members-and-roles.employee-cannot-change-role

- **Given** an employee
- **When** they try to change a member's role
- **Then** the server refuses, and the role stays

### Requirement: An organization keeps an admin

An organization must always keep a member who can manage the members: the last admin
can't become an employee, and the page says why.

#### Scenario: members-and-roles.last-admin-kept

- **Given** an organization with one admin
- **When** that admin tries to make themselves an employee
- **Then** the page doesn't offer it and says why, and the server refuses

### Requirement: A role change applies while signed in

A member whose role changes while they're signed in must get the new role's navigation
and page guards without reloading the page.

#### Scenario: members-and-roles.role-change-applied

- **Given** a signed-in member with the admin pages in their navigation
- **When** an admin makes them an employee, and they open an admin page
- **Then** they land on their start page, and the admin pages leave their navigation

### Requirement: Admins invite by email

Membership must be by invitation only. An admin must be able to invite an email address
with a role and get a link to send themselves; the app sends no email. The members page
must list the pending invitations with their expiry, and an admin must be able to cancel
one. Inviting a current member, or an address with a pending invitation, must be refused.

#### Scenario: members-and-roles.invite-link

- **Given** an admin on the members page
- **When** they invite an email address as an admin
- **Then** they get a link to copy, valid for seven days, and the invitation lists as
  pending with its role and expiry

#### Scenario: members-and-roles.invite-member-refused

- **Given** a member's address, and an address with a pending invitation
- **When** an admin invites either
- **Then** the server refuses, and the page says why

#### Scenario: members-and-roles.invitation-canceled

- **Given** a pending invitation
- **When** an admin cancels it
- **Then** it leaves the list, and its link no longer works

### Requirement: Signing in accepts an invitation

Opening an invitation link signed in with the invited address, verified, must accept it:
the user becomes a member with the invited role, and gets a profile named after their
account unless they already have one in that organization. Opening the link signed out
must lead through sign-in and back. An expired, canceled, or used invitation, or another
address, must not be accepted, and the page must say why.

#### Scenario: members-and-roles.invitation-accepted

- **Given** an invitation to a person who isn't a member
- **When** they open the link signed out and sign in with the invited address
- **Then** they land in the organization as a member with the invited role

#### Scenario: members-and-roles.profile-created

- **Given** an invited person, with no profile in the organization, or with one there
- **When** they accept the invitation
- **Then** they get a profile with their account's name, or keep the one they had

#### Scenario: members-and-roles.expired-refused

- **Given** an invitation whose seven days have passed
- **When** the invited person opens the link
- **Then** they don't become a member, and the page says the invitation has expired

### Requirement: Invitation only

A user who signs in without accepting an invitation must belong to no organization and
land on the "no access" page.

#### Scenario: members-and-roles.uninvited-no-access

- **Given** a user with no accepted invitation
- **When** they sign in
- **Then** they belong to no organization

### Requirement: Marking a leaver ends access

An admin must be able to mark a person as left with a date. One change must set the
leaving date, end the membership, and cancel an open update request; the profile and its
participations stay, so the person's work keeps showing on projects. The last admin can't
be marked as left. The People page must hide leavers unless asked. A leaver who accepts a
new invitation must be current again.

#### Scenario: members-and-roles.leaver-loses-access

- **Given** a member with an open update request
- **When** an admin marks them as left
- **Then** they are no longer a member, and the request is canceled

#### Scenario: members-and-roles.leaver-profile-kept

- **Given** a person with participations
- **When** an admin marks them as left
- **Then** their profile stays with its leaving date, and the projects still list their
  participations, marked as left

#### Scenario: members-and-roles.leavers-hidden

- **Given** a leaver
- **When** an admin opens the People page
- **Then** the leaver shows only when "Show leavers" is ticked, marked with the leaving
  date

#### Scenario: members-and-roles.rejoin-clears-leave

- **Given** a leaver
- **When** they accept a new invitation
- **Then** they are a member again, and their profile has no leaving date
