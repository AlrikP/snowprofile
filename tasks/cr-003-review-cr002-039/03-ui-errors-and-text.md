# CR-003.3: Error page, placeholders, and the copy button

Status: done

Errors and hints show in the UI language, and a failed copy says so (`review.md`,
findings 5 and 6).

## Acceptance criteria

- [x] A page whose loader fails shows a translated message in the frame: "not found" for
      `NOT_FOUND`, and the error code's message otherwise. A component test opens a
      deleted project's page. Today no route or router default sets an error component
      (`src/router.tsx:10`), so `src/routes/$organization/projects.$projectId.tsx:12`
      shows TanStack Router's English "Something went wrong!".
- [x] The invite form's email placeholder and the period filter's format hint come from
      `messages/`. Today they are `nimi@example.com`
      (`src/features/members/invite-dialog.tsx:135`) and `MM-YYYY`
      (`src/components/period-filter.tsx:41`) in both languages.
- [x] The invitation's copy button says when the clipboard refuses, as the CV view does
      (`src/features/cvs/cv-view.tsx:68`). Today it awaits `writeText` without a `catch`
      (`src/features/members/invite-dialog.tsx:44`).

## Outcome

- `RouteError` (`src/components/route-error.tsx`) is the router's `defaultErrorComponent`.
  It shows `errorMessage(error)`, so a `NOT_FOUND` from a read already says what wasn't
  found ("Project not found."), and an unexpected error gets the generic message, not
  its internals. No separate not-found branch was needed.
- Its test, `route-error.test.tsx`, uses a minimal router whose loader throws the project
  read's `project_not_found`, not the real route tree.
- The Estonian period filter hint is `KK-AAAA`.
