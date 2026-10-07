# Organizations

An organization holds a company's people, projects, and catalogues. Users can't create
organizations: the platform operator creates each one with a script and invites its first
admin, who invites the rest.

## Requirements

### Requirement: The operator creates organizations

The operator's script must create an organization with a slug, a name, and the default
technology categories, and invite the given address as its admin with a link the script
prints. Run again for an existing slug, it must change nothing and say so.

#### Scenario: organizations.created-by-script

- **Given** no organization with the slug `acme`
- **When** the operator runs `org:create acme "Acme OÜ" admin@acme.ee`
- **Then** the organization exists at `/acme`, with the technology categories Frontend,
  Backend, Data, Infrastructure, Testing, and Other

#### Scenario: organizations.first-admin-invited

- **Given** the operator created an organization for `admin@acme.ee`
- **When** that person opens the printed link, signed in with that address
- **Then** they are the organization's admin

#### Scenario: organizations.existing-slug-unchanged

- **Given** an organization with the slug `acme`
- **When** the operator runs the script for `acme` again, with another name or address
- **Then** nothing changes, and the script says the organization exists

### Requirement: Data stays in its organization

A member must reach only the data of organizations they belong to. The server must refuse
a request that names an organization the caller isn't a member of, and no read or write
must reach another organization's rows, whatever IDs the request names.

#### Scenario: organizations.isolated

- **Given** two organizations, each with its own projects, people, and catalogues
- **When** a member of one reads or changes data naming the other's rows
- **Then** they get nothing, and nothing changes

#### Scenario: organizations.non-member-refused

- **Given** a signed-in user who isn't a member of an organization
- **When** they call a server function naming that organization
- **Then** the server refuses

### Requirement: The URL names the organization

A signed-in page's address must start with its organization's slug, so each tab and each
link keep their own organization. A slug the user isn't a member of must open their own
organization instead.

#### Scenario: organizations.other-slug-redirected

- **Given** a signed-in member
- **When** they open a page under a slug they aren't a member of
- **Then** the app opens their own organization

### Requirement: Members of several organizations switch

A member of several organizations must be able to switch between them from the sidebar;
the page reopens under the other organization's slug. A member of one organization is
offered no switch.

#### Scenario: organizations.switched

- **Given** a member of Demo Software and Rabasaare Digital, on Demo's profile page
- **When** they switch to Rabasaare Digital
- **Then** the page reopens at `/rabasaare/profile`

#### Scenario: organizations.single-no-switch

- **Given** a member of one organization
- **When** they open the sidebar
- **Then** it names their organization and offers no switch
