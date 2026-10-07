# Demo data

A generator fills demo organizations with fictional people, customers, projects, and
participations, for demos, tests, and performance checks, so no real personal data is
needed outside the company stack (`docs/product.md`, "Demo data"). The seeder loads it
into a local database.

## Requirements

### Requirement: Fictional, repeatable data

The generated data must be the same for a seed on any day, and must use `example.com`
addresses only.

#### Scenario: demo-data.repeatable

- **Given** the generator and a seed
- **When** it runs on two different days
- **Then** it generates the same data

#### Scenario: demo-data.fictional

- **Given** the generated data
- **When** its email addresses are checked
- **Then** every one is at `example.com`

### Requirement: The seeder adds what is missing

The seeder must add only the demo organizations the database lacks, keeping any change
made since. With `--reset <slug>`, it must replace that one demo organization's data and
leave the others alone.

#### Scenario: demo-data.missing-added

- **Given** a database with some of the demo organizations
- **When** the seeder runs
- **Then** it adds the missing ones only

#### Scenario: demo-data.changes-kept

- **Given** a seeded database with a change made in the app
- **When** the seeder runs again
- **Then** it adds nothing, and the change stays

#### Scenario: demo-data.reset-one

- **Given** a seeded database with changes in two demo organizations
- **When** the seeder runs with `--reset` for one of them
- **Then** that one is as generated, and the other keeps its change

### Requirement: The seeder never touches real data

The seeder must refuse to run outside demo mode, on a database that isn't a local file,
and on a database that holds an organization that isn't a demo one. `--reset` must refuse
a slug that isn't a demo organization.

#### Scenario: demo-data.refused-outside-demo

- **Given** `DEMO_MODE` off, or unset in production
- **When** the seeder runs
- **Then** it refuses

#### Scenario: demo-data.refused-remote

- **Given** a database that isn't a local file
- **When** the seeder runs
- **Then** it refuses

#### Scenario: demo-data.refused-real-organization

- **Given** a database that holds an organization that isn't a demo one
- **When** the seeder runs
- **Then** it refuses

#### Scenario: demo-data.reset-refused-real

- **Given** a slug that isn't a demo organization's
- **When** the seeder runs with `--reset` for it
- **Then** it refuses
