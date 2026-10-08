# CR-005.2: Discard guard only for unsaved changes

Status: todo

Esc and a click outside ask "Discard your changes?" only when the dialog holds changes
that aren't saved (`review.md`, finding 2).

## Acceptance criteria

- [ ] Esc on the invite dialog's link view, after the invitation is created or its link
      copied, closes the dialog at once. Today `markChanged`
      (`src/components/ui/dialog.tsx:57`) keeps the address typed before saving as a
      change, and counts the Copy button, so the dialog asks to discard though the
      invitation is saved.
- [ ] Opening a saved participation, education entry, own project, or contact, clicking
      Delete, then Cancel, and pressing Esc closes the dialog at once. Today the
      `type="button"` clicks count as changes
      (`src/features/profile/participation-dialog.tsx:331`, `education-dialog.tsx:185`,
      `own-project-dialog.tsx:319`, `src/features/projects/contact-dialog.tsx:199`).
- [ ] Typing, choosing, ticking, and adding or removing a picker entry still ask before
      discarding, as task 055's tests check.
- [ ] Component tests cover both cases above.
