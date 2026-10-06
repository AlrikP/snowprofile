# Employee profile

A member's own profile in an organization: the name used on CVs, the join date, an
optional birth date, and education. Each member keeps their own profile on the "My
profile" page; participations and own projects have their own specs.

## Requirements

### Requirement: A member keeps their own details

A member must be able to change their own name, join date, and birth date, and nobody
else's: the server must change only the signed-in user's profile, whatever the input
names. Each save must record who changed the profile and when. A member without a profile
yet must see an empty one named after their account, which their first save stores.

#### Scenario: employee-profile.details-saved

- **Given** a member on their profile
- **When** they change their name, join date, and birth date
- **Then** the profile shows the new values, and records them as the last change

#### Scenario: employee-profile.other-profile-refused

- **Given** a member and another person's profile and education entry
- **When** the member sends a change naming the other profile or entry
- **Then** the other profile and entry stay as they were

### Requirement: Birth date is private

A birth date must be optional. Only the person and admins must see it; the server must
leave it out of every response that shows the profile to anyone else.

#### Scenario: employee-profile.birth-date-optional

- **Given** a member on their profile
- **When** they save their details without a birth date
- **Then** the profile is saved, with the birth date not added

#### Scenario: employee-profile.birth-date-hidden-from-employees

- **Given** a project participant with a birth date
- **When** an employee opens the project
- **Then** the response lists the participant, and holds no birth date

### Requirement: Education entries

A member must be able to add, change, and delete education entries: an institution, a
field, and a degree in Estonian and English, and an optional period. The institution needs
at least one language. Entries must list newest first, undated ones last.

#### Scenario: employee-profile.education-added

- **Given** a member with education entries
- **When** they add an entry with only an institution, and dated ones
- **Then** the entries list newest first, the undated one last

#### Scenario: employee-profile.education-deleted

- **Given** a member's education entry
- **When** they delete it after confirming
- **Then** it leaves their profile
