# CR-003.3: Error page, placeholders, and the copy button

Status: todo

Errors and hints show in the UI language, and a failed copy says so (`review.md`,
findings 5 and 6).

## Acceptance criteria

- [ ] A page whose loader fails shows a translated message in the frame: "not found" for
      `NOT_FOUND`, and the error code's message otherwise. A component test opens a
      deleted project's page. Today no route or router default sets an error component
      (`src/router.tsx:10`), so `src/routes/$organization/projects.$projectId.tsx:12`
      shows TanStack Router's English "Something went wrong!".
- [ ] The invite form's email placeholder and the period filter's format hint come from
      `messages/`. Today they are `nimi@example.com`
      (`src/features/members/invite-dialog.tsx:135`) and `MM-YYYY`
      (`src/components/period-filter.tsx:41`) in both languages.
- [ ] The invitation's copy button says when the clipboard refuses, as the CV view does
      (`src/features/cvs/cv-view.tsx:68`). Today it awaits `writeText` without a `catch`
      (`src/features/members/invite-dialog.tsx:44`).
