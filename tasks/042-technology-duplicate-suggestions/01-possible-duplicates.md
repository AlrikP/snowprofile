# 042.1: Possible duplicates for admins

Status: done

The technologies page shows admins the near-duplicate pairs (task 042, decision 1), each
with both entries' uses, a merge button that opens the merge dialog with the target
chosen, and "Not a duplicate", which hides the pair for good (decision 3).

## Acceptance criteria

- [x] The rule is in `src/lib/`, with unit tests for the pairs in task 042's decision 2
      and the false matches it avoids, and it is recorded in `docs/architecture.md`.
- [x] A migration adds `technology_distinct_pair`: an organization's pairs marked "Not a
      duplicate", with composite foreign keys to `technology` and the pair stored in one
      order. `datamodel/` is regenerated.
- [x] Admins see "Possible duplicates" on the technologies page; employees don't. Merge
      opens the merge dialog for the entry with fewer uses, with the other chosen as the
      target.
- [x] "Not a duplicate" is a named mutation admins only can call; the pair leaves the list
      and stays out after a reload. Repository functions have tenancy cases.

## Spec changes

- Added: requirement "Near-duplicates are suggested" in
  `docs/specs/technology-catalogue.md`, with scenarios
  `technology-catalogue.near-duplicates-listed` and
  `technology-catalogue.near-duplicate-dismissed`.

## Outcome

- The rule is `src/lib/technology-duplicates.ts`, recorded in `docs/architecture.md`,
  "Technology duplicates". `technology-duplicates.test.ts` holds the 22 intended pairs, 11
  look-alikes it keeps apart, and the seed's catalogue, which has no pairs.
- The pairs are computed on the client from the catalogue query, which now returns
  `distinctPairs`; task 042.2's warning uses the same function. Nothing records the
  suggestions themselves.
- Migration `20261007141237_technology_distinct_pair` adds the table, with composite keys
  to both technologies and a check that the lower ID comes first. `markNotDuplicate`
  needs `technology: ['curate']` and live entries on both sides; marking a pair twice
  changes nothing.
- The suggested merge keeps the entry with more uses, then the one without an alias or a
  version, then the shorter name; the merge dialog opens with that target chosen and can
  still be changed (`initialIntoId`).
- Found while checking: the alias table was a plain object, so a technology named
  "Constructor" would have found `Object.prototype.constructor`. It is a `Map` now, with a
  test.
- Checked with unit, server, tenancy, and component tests; not in a browser.
