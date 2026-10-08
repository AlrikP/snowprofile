# 055: Confirm before discarding dialog changes

Status: done

Esc or a click outside closes a dialog at once, so a slip discards whatever the person
typed, for example a half-filled own project. Asked for by the user on 2026-10-08.

When anything in a dialog has changed, Esc and a click outside ask whether to discard the
changes. Cancel and the close button stay immediate: they are deliberate.

## Acceptance criteria

- [x] In every dialog, Esc or a click outside closes it at once while nothing has changed.
- [x] After a change (typing, choosing, ticking, or picking or removing an entry), Esc or a
      click outside asks "Discard your changes?" with "Keep editing" and "Discard".
- [x] "Keep editing" and a second Esc return to the dialog with the changes; "Discard"
      closes it.
- [x] Cancel and the close button close at once, as now.
- [x] Component tests cover the guard; the confirmation works by keyboard.

## Outcome

- The guard is in the shared `DialogContent` (`src/components/ui/dialog.tsx`), so every
  dialog has it. A change is an `input` event, or a click on an option or a
  `type="button"` button in the dialog, such as a picker's add or remove. Typing and then
  deleting it again still counts as a change.
- The confirmation is a nested dialog, centered on the screen. A panel inside the
  dialog was tried first; in a dialog scrolled down, as the own-project one can be, it
  covered only part of the form.
- Radix hears Esc on the document before the focused field does. Esc from a combobox
  whose list is open only closes the list; without that, one Esc closed the list and asked
  to discard.
- Tests: component tests in `dialog.test.tsx` cover Esc, both buttons, a second Esc, and a
  button change. jsdom never reports a click outside to Radix, so the e2e test on the
  own-project dialog covers it, with the open picker list.
