# Sign-in

How people get into the app and where they land: Google sign-in on the company stack,
password sign-in for the seeded users of a demo, and the checks on who may sign in. The
reasons and the implementation are in `docs/architecture.md`, "Sign-in modes".

## Requirements

### Requirement: Demo sign-in

In demo mode, the seeded users must be able to sign in with the published password, and
the sign-in page must list their accounts.

#### Scenario: sign-in.demo-password

- **Given** demo mode is on
- **When** a seeded user signs in with the published password
- **Then** they are signed in

#### Scenario: sign-in.wrong-password

- **Given** demo mode is on
- **When** someone signs in as a seeded user with another password
- **Then** the sign-in is refused

#### Scenario: sign-in.demo-accounts-listed

- **Given** demo mode is on
- **When** a visitor opens the sign-in page
- **Then** it shows a "demo version" notice with the seeded accounts and a password form

### Requirement: No passwords outside demo mode

Outside demo mode, the server must refuse password sign-in, whatever the page shows, and
nobody can create a password account in any mode.

#### Scenario: sign-in.no-password-outside-demo

- **Given** demo mode is off
- **When** someone signs in as a seeded user with the right password
- **Then** the server refuses it

#### Scenario: sign-in.no-demo-form-outside-demo

- **Given** demo mode is off
- **When** a visitor opens the sign-in page
- **Then** it shows no password form and no demo accounts

#### Scenario: sign-in.no-sign-up

- **Given** any mode
- **When** someone tries to sign up with a password
- **Then** the server refuses it

### Requirement: Google sign-in

Outside demo mode, the app must offer Google sign-in when a Google client is configured,
and only then.

#### Scenario: sign-in.google-offered

- **Given** demo mode is off and a Google client is configured
- **When** a visitor opens the sign-in page
- **Then** it offers sign-in with Google

#### Scenario: sign-in.google-off-in-demo

- **Given** demo mode is on and a Google client is configured
- **When** a visitor opens the sign-in page
- **Then** it doesn't offer Google

#### Scenario: sign-in.google-off-unconfigured

- **Given** no Google client is configured
- **When** a visitor opens the sign-in page
- **Then** it doesn't offer Google

### Requirement: Login domains

With a login domain allowlist, only verified addresses in those domains can sign in;
without one, any address can. Demo mode and an allowlist can't be on together.

#### Scenario: sign-in.any-domain

- **Given** no allowlist
- **When** a user with any address signs in
- **Then** they are signed in

#### Scenario: sign-in.allowed-domain

- **Given** an allowlist with the user's domain
- **When** the user signs in
- **Then** they are signed in

#### Scenario: sign-in.domain-refused

- **Given** an allowlist without the user's domain
- **When** an existing user signs in
- **Then** the sign-in is refused, so narrowing the list locks out existing users

#### Scenario: sign-in.new-user-domain-refused

- **Given** an allowlist without the person's domain
- **When** someone without an account signs in for the first time
- **Then** no account is created

#### Scenario: sign-in.unverified-refused

- **Given** an allowlist
- **When** someone signs in with an address the provider hasn't verified
- **Then** the sign-in is refused

#### Scenario: sign-in.domain-error-explained

- **Given** a sign-in was refused for its domain
- **When** the sign-in page shows the result
- **Then** it says that the address's domain isn't allowed

#### Scenario: sign-in.demo-with-allowlist-refused

- **Given** demo mode is on and an allowlist is set
- **When** the app starts
- **Then** it refuses to start

### Requirement: Shared demo accounts stay usable

In demo mode, the seeded accounts are shared, so a visitor must not be able to change
them: not their password, email, or profile, not their linked accounts, and not other
people's sessions.

#### Scenario: sign-in.demo-accounts-locked

- **Given** demo mode is on and a visitor is signed in as a seeded user
- **When** they try to change the account's password, email, profile, or linked accounts,
  delete it, or sign out its other sessions
- **Then** the server refuses each change

### Requirement: Where people land

A visitor must land where they belong: signed out on the sign-in page, without a
membership on a "no access" page, and as a member in an organization.

#### Scenario: sign-in.signed-out-redirected

- **Given** a visitor who isn't signed in
- **When** they open any page of the app
- **Then** they land on the sign-in page

#### Scenario: sign-in.no-membership

- **Given** a signed-in user who belongs to no organization
- **When** they open the app
- **Then** they land on the "no access" page

#### Scenario: sign-in.first-organization

- **Given** a member of one or more organizations
- **When** they sign in
- **Then** the app opens in their first organization

#### Scenario: sign-in.opens-active-organization

- **Given** a member who switched to another organization
- **When** they open the app again
- **Then** it opens in the organization they switched to
