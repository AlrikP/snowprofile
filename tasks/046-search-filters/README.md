# 046: Search by role and solution characteristics

Status: todo

Tenders ask for people who held a role, such as an architect, or who worked on projects
with a given solution, such as X-Road or containers. Search finds people only by
technology and period: `SearchInput` in `src/server/search/search.schemas.ts` requires at
least one technology, and the search page (`src/features/search/`) offers nothing else.

This task adds role and characteristic filters to search, and carries them to CV
selection. It also covers what was task 047 (search by role), merged here because both
change the same form and server input; number 047 stays unused.

## Decisions

Decided with the user, recorded in `docs/product.md`, "Search filters":

1. A search names at least one technology, role, or characteristic; each is optional.
2. A project must have every chosen characteristic. The any/all switch stays for
   technologies only.
3. Work matches a role when it has one of the chosen roles.
4. A role, a characteristic, and a technology must match on the same participation or own
   project.
5. Own projects are left out while characteristics are chosen, since they have no
   answers.
6. "Make CV" passes the whole filter, and CV selection includes only the work it matches.

## Subtasks

- 046.1: Search by solution characteristics (`01-characteristics.md`)
- 046.2: Search by role (`02-roles.md`)
- 046.3: Filter CVs by role and characteristics (`03-cv-selection.md`)
