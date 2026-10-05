# Behavior specs

A spec records what one capability does, as a user or a client can observe it: what it
must, should, or can do, and the scenarios that show it. Specs are living documents.
A task that changes behavior proposes its spec changes, and the commit that implements
the task applies them, so a spec always describes the code on `main`.

Specs describe behavior only. Tables, components, libraries, and the reasons behind a
design belong in `docs/architecture.md`; product scope and open questions in
`docs/product.md`.

## Files

One file per capability, named after its row in the MVP scope table in
`docs/product.md`, in kebab case: the "Sign-in" row is `sign-in.md`. A capability without
a spec yet has none; its feature task writes it.

```markdown
# Sign-in

One paragraph: what the capability is for, and who uses it.

## Requirements

### Requirement: Demo sign-in

In demo mode, the seeded users must be able to sign in with a published password.

#### Scenario: sign-in.demo-password

- **Given** demo mode is on
- **When** a seeded user signs in with the published password
- **Then** they are signed in
```

## Requirements

- A requirement states one rule with **must** (required), **should** (expected, with
  stated exceptions), or **can** (allowed). The words mean what they mean in the style
  guide's "Keep status exact".
- Each requirement has one or more scenarios.
- State behavior a user or client can observe: what the page shows, what the server
  accepts or refuses, where a request leads. Not how the code achieves it.

## Scenarios

- A scenario is one example of a requirement, as **Given** (the situation), **When** (the
  action), and **Then** (the observable result). Add **And** lines where a step needs
  more than one.
- Its heading is its ID: `#### Scenario: <capability>.<slug>`, for example
  `sign-in.demo-password`. The capability is the spec's file name; the slug names the
  case in a few words.
- An ID is stable. Rewording a scenario keeps its ID; a scenario that changes meaning
  gets a new one. Never reuse a removed ID.

## Tests cite scenarios

Every scenario has at least one test, and the test starts its title with the scenario's
ID:

```ts
test('sign-in.no-password-outside-demo: the server rejects password sign-in', ...)
```

The test lives at the lowest level that can check the scenario: `bun test` for a server
rule, Vitest for a component, Playwright for a journey across pages. A scenario can have
tests at several levels. A test cites one ID; a test that checks two scenarios is split.

`bun run specs:check` fails when a scenario has no test citing it, or a test cites an ID
no spec defines. It runs in the pre-commit hook and in CI. It checks that a test cites
the scenario, not that the test checks what the scenario says; reviews check that.

## Changing a spec

A task that changes behavior has a "Spec changes" section (`tasks/README.md`), reviewed
with the task. The commit that implements the task applies it to the spec, together with
the tests that cite the new or changed scenarios.
