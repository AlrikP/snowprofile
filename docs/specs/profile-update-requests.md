# Profile update requests

Admins keep the profiles current: they see when each person last confirmed their profile,
ask people to bring it up to date, and see the open requests. The request appears in the
app; there is no email.

## Requirements

### Requirement: Admins see confirmations

Admins must see every profile in the organization with its last confirmation, its open
update request, and how many participations it has. A confirmation older than six months,
or none, must be marked. Members who can't read every profile must be refused the list.

#### Scenario: profile-update-requests.last-confirmation-shown

- **Given** a profile confirmed on 30 August 2026 with an open request
- **When** an admin opens the People page
- **Then** the person's row shows the confirmation date, the request with its date, and
  the participation count

#### Scenario: profile-update-requests.stale-marked

- **Given** a profile confirmed over six months ago, and one never confirmed
- **When** an admin opens the People page
- **Then** both are marked as over six months old, the second as never confirmed

### Requirement: Admins request updates

An admin must be able to ask one person, or everyone without an open request, to update
their profile, with an optional message, and to cancel an open request. A profile has at
most one open request, and leavers get none. Employees must not request updates.

#### Scenario: profile-update-requests.requested

- **Given** an admin and a person without an open request
- **When** the admin requests an update with a message
- **Then** the person has an open request with that message, opened by the admin

#### Scenario: profile-update-requests.one-open-request

- **Given** a person with an open request
- **When** an admin requests another update from them
- **Then** the server refuses

#### Scenario: profile-update-requests.request-all-skips-open

- **Given** some people with open requests, and some leavers
- **When** an admin requests an update from everyone
- **Then** everyone else gets a request with the message; the open requests keep theirs,
  and leavers get none

#### Scenario: profile-update-requests.canceled

- **Given** a person with an open request
- **When** an admin cancels it
- **Then** the request is closed as canceled

#### Scenario: profile-update-requests.employee-cannot-request

- **Given** an employee
- **When** they request an update from someone
- **Then** the server refuses

### Requirement: The employee sees the request

A member with an open update request must see it when they open the app: on their
profile, with who asked, when, and the message; on any other page, as a notice that leads
to the profile.

#### Scenario: profile-update-requests.notice-shown

- **Given** a member whose profile has an open request with a message
- **When** they open the app
- **Then** the profile shows the request with the admin's name, the date, and the
  message, and other pages show a notice that links to the profile

### Requirement: Confirming closes the request

The profile must show its last confirmation, or that it was never confirmed. "Profile is
up to date" must record the confirmation and close an open request as confirmed; it works
without a request too.

#### Scenario: profile-update-requests.confirmed

- **Given** a member with an open request
- **When** they confirm their profile is up to date
- **Then** the confirmation is recorded, the request is closed as confirmed, and the
  notice is gone

#### Scenario: profile-update-requests.confirmed-without-request

- **Given** a member without an open request
- **When** they confirm their profile is up to date
- **Then** the confirmation is recorded and the profile shows its date
