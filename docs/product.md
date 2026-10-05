# Product

## Purpose

snowprofile replaces the Google Sheet (`Snowhound_CV_baas.xlsx`) that records Snowhound's
projects, the technologies used, and which employees worked on them. Its main job is
producing CVs for public procurement tenders (riigihanked): a personal CV, or a team CV
that combines several people's CVs. Tenders rarely share a format, so the MVP gives a
table to copy and paste into the tender's own document, plus a minimal Word document.

Users:

- **Admins (managers)** maintain projects, request profile updates, find people by
  technology, and generate personal and team CVs.
- **Employees** keep their own profile and project participations current.

More roles come later; the role model must allow adding them.

## Principles

- **Minimal first.** Ship the smallest version that replaces the sheet; grow from real
  use.
- **Data quality over speed.** Structured fields (real dates, numeric hours, catalogue
  technologies) even when entry takes a little longer. The sheet's free text is what we
  are leaving behind.
- **Privacy by default.** Store only the personal data CVs need, and show the minimum by
  default.
- **Demo-safe.** Every feature works with fictional data, and nothing leaks between
  organizations.

## MVP scope

| Area                      | Included                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sign-in                   | Google sign-in; access by organization membership (see [Users and access](#users-and-access))                                                                                                                                                                                                                                                               |
| Organizations             | Several organizations in one deployment, with data fully isolated per organization. A demo stack holds several fictional organizations; the company stack holds Snowhound and possibly other companies later                                                                                                                                                |
| Members and roles         | Roles `admin` and `employee` per organization; admins invite members and change roles                                                                                                                                                                                                                                                                       |
| Projects                  | Admins create and edit org projects: name, description (ET/EN), customer, start and end month or "ongoing", tender reference number, customer contact persons, total hours, cost, technologies, solution characteristics                                                                                                                                    |
| Technology catalogue      | Shared list per organization, grouped by category (Frontend, Backend, Data, Infra, Testing, Other). Anyone can add an entry; admins rename, recategorize, and merge duplicates (Postgres → PostgreSQL)                                                                                                                                                      |
| Role catalogue            | Shared list of project roles per organization (arendaja / developer, analüütik / analyst…), each with an Estonian and an English name. Anyone can add an entry and must fill both names; admins rename and merge duplicates. Entries from the sheet migration can lack the English name, which the list flags                                               |
| Technical characteristics | Admins manage a checklist of yes/no questions that tenders ask about a project's solution (automated tests, REST/SOAP, relational DB, DB migrations, Linux, X-Road, containers/K8s, monitoring…); each project answers yes or no, with an optional note. A project shows its answers as solution characteristics. The data model calls them tender criteria |
| Employee profile          | Name, join date, optional birth date, education (institution, field, period, degree; several entries)                                                                                                                                                                                                                                                       |
| Project participation     | Employee on a project: start and end month (or ongoing), one or more roles from the role catalogue, approximate hours, tasks (ET/EN), technologies they used (a subset of or addition to the project's)                                                                                                                                                     |
| Own projects              | An employee adds a project that appears only on their own CV (from an earlier employer, or several engagements merged into one); same fields as an org project                                                                                                                                                                                              |
| Profile update requests   | An admin requests an update from an employee; the employee sees it on sign-in and confirms the profile is current. Admins see each profile's last confirmation and open requests                                                                                                                                                                            |
| Search                    | Filter people by technology and optionally a time period; results show the matching projects and participations                                                                                                                                                                                                                                             |
| CV selection              | Pick one person (personal CV) or several (team CV), pick the language (ET/EN), and choose which projects to include (all by default, or filtered by technology or period)                                                                                                                                                                                   |
| CV view                   | The selection shown on screen as a project and technology table, built so it pastes cleanly into Word or Google Docs with its table structure kept                                                                                                                                                                                                          |
| CV document               | DOCX from one minimal built-in template per language: people, their projects, roles, periods, and technologies. A team CV is one document, with shared projects listed once. No per-organization or per-tender templates                                                                                                                                    |
| Bilingual content         | Text fields hold an Estonian and an English version; the CV uses the chosen language and flags missing translations before generating                                                                                                                                                                                                                       |
| Sheet migration           | A one-off script, with no UI, loads `Snowhound_CV_baas.xlsx` into Snowhound's organization on the company stack. Re-running it updates matched records instead of duplicating them, so it can be rehearsed. It lists the values it can't parse for an admin to fix in the app                                                                               |
| Demo data                 | A generator of fictional organizations, customers, projects, employees, and participations, for demos, automated tests, and performance checks, so no real personal data is needed outside the company stack                                                                                                                                                |
| UI languages              | Estonian and English, switchable per user                                                                                                                                                                                                                                                                                                                   |

## Not in MVP

- Email of any kind (invitations are shared as links; update requests appear in the app).
- Integrations: Google Drive export, Google Sheets sync, HR systems.
- AI help (translation, description drafting, matching people to a tender).
- PDF output (export the DOCX to PDF by hand if needed).
- Custom or uploaded CV templates, and formats tailored to a tender. Nearly every tender
  wants a slightly different format; whether a common representation is worth building
  is decided after the MVP, from real use.
- Per-CV text overrides and saved, named CV versions.
- A notice on sign-in about technologies added to a project since the person's
  participation ("Project X now lists Kafka. Did you use it?"). It would need to store
  each person's "didn't use it" answers so it doesn't come back.
- Import and export in the app. A later design could export to a fixed template and import
  from the same template, so another organization can fit its existing data to it.
- Advanced matching: scoring people against a tender's requirements.
- Skill levels or self-assessed proficiency per technology.
- Roles beyond `admin` and `employee` (for example sales or read-only).
- Personal ID codes (isikukood): never stored.
- Public self-signup for organizations; platform admins create organizations.
- A one-click demo login without a Google account.
- Passkey sign-in, as a second method beside Google (task 020).
- A dark mode, once the feature views have settled (task 022).

## Users and access

- **Sign-in:** Google sign-in (OAuth / OpenID Connect) in every deployed environment that
  holds real data. No passwords of our own there.
- **Demo and development sign-in:** local development, automated tests, and a demo stack
  allow email and password sign-in for seeded, fictional users (for example
  `admin@demo.example.com`), so people and agents can sign in without Google. One setting
  switches this on, and the sign-in page then shows a "demo version" notice.
  `architecture.md` ("Sign-in modes") holds the guardrails.
- **Company login domains:** the company stack can restrict sign-in to company addresses
  (for example `snowhound.eu`).
- **Tenancy:** multi-tenant from day one. Every record belongs to one organization, and a
  user only ever sees data from the organization they are working in.
- **Membership:**
  - Snowhound: users with a company Google Workspace account (company domain) join the
    Snowhound organization automatically as `employee`.
  - Other organizations, including demo ones: any Google account can sign in, but access
    needs an invitation from an organization admin.
  - A user can belong to several organizations (for example a Snowhound admin who also
    runs the demo organization) and switches between them.
- **Roles per organization:** `admin` and `employee`, designed so more roles can be added
  later without reworking access checks.
- **Platform operator:** someone creates organizations and their first admin. In the MVP
  that can be a seeded configuration or a script rather than a UI.

## Technologies on projects and participations

A participation's technologies appear in that person's CV, so only the person changes
them. An admin's edit to the project never changes them.

- **New participation:** the form starts with the project's technologies. The person
  removes the ones they didn't use and adds the ones only they used. The saved list is the
  person's own copy, not a link to the project's list.
- **A person adds a technology:** it stays on their participation. The project page shows
  admins the technologies participants used that the project doesn't list, with how many
  participants used each one. An admin can add one to the project; nothing changes
  otherwise.
- **An admin adds a technology to the project:** existing participations don't get it.
  The participation form suggests the project's technologies that the person's list
  lacks, so the person sees it the next time they edit.
- **An admin removes a technology from the project:** participations keep it.

Both suggestion lists are computed when shown, so nothing records them.

## Data and privacy

### Data kept

- Organizations, members, roles, invitations.
- Customers (ordering organizations) and customer contact persons.
- Projects, with technologies and solution characteristics.
- Employees' profiles, education, project participations, and own projects.
- The technology and role catalogues, and the technical characteristics list.
- Profile update requests and confirmations.

### Personal data and GDPR

- **Employees:** name, Google account email, join date, optional birth date (some tenders
  ask for it), education, work history. The personal ID code is **not** stored, even
  though the sheet has it.
- **Third parties:** customer contact persons (name, email, phone) appear as tender
  references. Store only what references need, and allow marking a contact as no longer
  valid (the sheet already notes "no longer works at Telia").
- **Visibility:** admins edit cost, hours, customer contacts, and tender reference
  numbers. Employees can read them on projects they took part in.
- **Birth date** shows only to admins and the person, and goes into a CV only when chosen
  explicitly.
- **Residency:** data stays in the EU (`hosting.md`).
- **Isolation:** no data crosses organizations. Demo organizations contain only
  generated, fictional data.
- **Change tracking:** record who last changed a project or profile and when; this
  supports the profile confirmation flow. A full audit history can come later.

### Languages

- **UI:** Estonian and English, switchable per user.
- **Content:** text fields hold both Estonian and English; either may be missing.
- **CV output:** generated in Estonian or English; missing translations are flagged
  before generating.
- **Sheet migration:** the existing sheet is in Estonian and fills the Estonian versions.

## Open questions

- **CV table columns:** which columns the copy-and-paste table needs (project, customer,
  period, role, hours, technologies…), and whether a team CV gets one table or one per
  person. The MVP uses the prototype's table (`prototypes/cv.html`), which pastes into a
  spreadsheet with its structure kept. Review the output format once the app is in use,
  against one or two past tender submissions.
- **Common CV format:** after the MVP, is there a meaningful common format across
  tenders, or is copy and paste enough? Decide from how the MVP outputs are used.
- **Update requests without email:** is an in-app notice on sign-in enough, or are update
  emails needed soon after the MVP? Decide after a first round of use.
- **Snowhound domain auto-join:** should everyone with a company Google account join
  automatically, or only those an admin invites? Snowhound's management decides.
- **Leavers:** a leaver's profile is kept with a leaving date, left out of search and new
  CVs by default, and their participations stay visible on projects as references
  (`architecture.md`, "Audit and deletion"). Open: whether, and after how long, the
  profile is anonymized or deleted. Needs a GDPR retention decision.
- **Certificates and trainings:** tenders often ask for them, and the sheet doesn't record
  them. In the MVP or later?
- **Computed experience totals:** per-person totals derived from participations (years
  with a technology, total hours) in search and CVs: in the MVP or later?
