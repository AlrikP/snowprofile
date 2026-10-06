# 042: Technology duplicate suggestions

Status: todo
Depends on: task 026 (the technology catalogue)

Task 026 refuses a name that matches a live entry exactly after normalizing. The prototype
(`prototypes/technologies.html`) also shows near-duplicates: a "Possible duplicates" list
for admins (Postgres → PostgreSQL, React.js → React) with a merge button each, and a
warning with "Add anyway" when a new name is close to an existing one (state `duplicate`).

Near-duplicates need a heuristic, and an obvious one is wrong: a prefix match pairs Java
with JavaScript. Decide the rule first, for example a known suffix list (`js`, `sql`), an
edit distance threshold on short names, or a hand-kept alias list, and check it against the
seed's catalogue and the sheet's technology names.

## Acceptance criteria

- [ ] The rule is recorded in `docs/architecture.md`, with the pairs it was checked
      against and the false matches it avoids.
- [ ] Admins see the suggested pairs on the technologies page, each with how many uses
      it has and a merge button that opens the merge dialog with the target chosen.
- [ ] Adding or renaming to a near-duplicate warns and names the existing entry; "Add
      anyway" still adds it.

## Spec changes

- Modified: `docs/specs/technology-catalogue.md`, adding a requirement:
  - Near-duplicates are suggested: `technology-catalogue.near-duplicates-listed`,
    `technology-catalogue.near-duplicate-warned`.
