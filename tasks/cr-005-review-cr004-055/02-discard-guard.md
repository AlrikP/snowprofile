# CR-005.2: Discard guard only for unsaved changes

Status: done

Esc and a click outside ask "Discard your changes?" only when the dialog holds changes
that aren't saved (`review.md`, finding 2).

## Acceptance criteria

- [x] Esc on the invite dialog's link view, after the invitation is created or its link
      copied, closes the dialog at once. Today `markChanged`
      (`src/components/ui/dialog.tsx:57`) keeps the address typed before saving as a
      change, and counts the Copy button, so the dialog asks to discard though the
      invitation is saved.
- [x] Opening a saved participation, education entry, own project, or contact, clicking
      Delete, then Cancel, and pressing Esc closes the dialog at once. Today the
      `type="button"` clicks count as changes
      (`src/features/profile/participation-dialog.tsx:331`, `education-dialog.tsx:185`,
      `own-project-dialog.tsx:319`, `src/features/projects/contact-dialog.tsx:199`).
- [x] Typing, choosing, ticking, and adding or removing a picker entry still ask before
      discarding, as task 055's tests check.
- [x] Component tests cover both cases above.

## Outcome

- A button that changes no value carries `data-no-change`, and the guard skips it: Delete,
  the confirmation's Cancel and Delete in the four dialogs, and Copy. Buttons stay counted
  by default, so a missed marker asks once too often rather than losing an edit.
- `useMarkDialogUnchanged` (`src/components/ui/dialog.tsx`) lets a dialog that saves and
  stays open clear the flag; the invite form calls it when the invitation is created.
- The five new tests fail against the guard from task 055 and pass now. Task 055's tests
  pass unchanged.
- Checked in jsdom and the e2e run, not by hand in a browser.
