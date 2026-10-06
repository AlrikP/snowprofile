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
