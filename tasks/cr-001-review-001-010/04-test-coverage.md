# CR-001.4: Test order and coverage

Status: done
Depends on: task cr-001.1 (a clean checkout to test against)

## Acceptance criteria

- [x] Tests pass in any order: `bun test --randomize` passes for several seeds, and CI
      runs it. Today `account.findLocale` in `src/server/tenancy.test.ts:67` and the
      relations test in `src/db/people.test.ts:288` depend on earlier tests' rows.
- [x] A test calls a scoped server function through its middleware chain and covers a
      missing `organizationId` and a non-member organization.
- [x] A test covers `getAccess` putting the saved locale in the cookie (task 010.2,
      "applying it at sign-in").
