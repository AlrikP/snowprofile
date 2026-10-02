# CR-001.5: Indexes and relations

Status: todo
Depends on: task cr-001.1 (a clean checkout to test against)

## Acceptance criteria

- [ ] A migration makes "one open update request per profile" a partial unique index
      (`WHERE closed_at IS NULL`), replacing `update_request_profile_id_open_idx`.
- [ ] Tenant tables that list rows per organization get an index that leads with
      `organization_id`, at the latest with their first list query: `technology_category`,
      `tender_criterion`, `contact_person`, `education`, `participation`, `own_project`,
      `update_request`, and the link tables.
- [ ] `user.profiles` and `user.memberships` in `src/db/relations.ts`, which span
      organizations, are removed, or the file states that queries through them need a
      scoped `where`.
