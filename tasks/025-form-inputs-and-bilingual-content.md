# 025: Form inputs and bilingual content

Status: todo

Build the inputs that several feature forms share, so the feature tasks can run in
parallel instead of each building its own: the period input, the approximate number
input, and the bilingual field. They go in `src/components/` and `src/lib/`, because more
than one feature needs them (`AGENTS.md`, "Code conventions").

Builds on: `docs/architecture.md` ("Data conventions": periods, approximate numbers,
bilingual text); `prototypes/project-edit.html` (period with day, month, and year; hours
and cost with a qualifier; ET/EN description) and its `year-only` and `invalid-period`
states.

## Acceptance criteria

- [ ] A period input takes a day, month, and year, any of day and month left empty, and an
      Ongoing checkbox. It produces `YYYY-MM-DD`, `YYYY-MM`, or `YYYY` and an end of null
      while ongoing. Saving with Ongoing ticked clears the end date; ticking it alone
      doesn't (carried from task 011.6).
- [ ] The period input rejects a day without a month, an impossible date, and an end
      before the start compared on the end's precision, with the same rule as the
      database `CHECK`.
- [ ] A shared Valibot schema for periods and approximate numbers in `src/server/schemas.ts`,
      so every server function validates them the same way.
- [ ] An approximate number input: a value and a qualifier (`exact`, `approximately`,
      `more_than`), the qualifier required exactly when the value is set.
- [ ] A bilingual field shows an Estonian and an English input, labelled by language,
      either one optional unless the form requires one.
- [ ] Display helpers: a period formatted as `DD-MM-YYYY`, `MM-YYYY`, or `YYYY` with an
      open end while ongoing, an approximate number with its qualifier, and a bilingual
      value in the UI language, falling back to the other language with a "translation
      missing" mark.
- [ ] Component tests cover each input and the fallback.

## Spec changes

- Added: `docs/specs/bilingual-content.md`, with requirements:
  - Both languages are editable: `bilingual-content.both-languages-editable`.
  - A missing translation shows the other language, marked as missing:
    `bilingual-content.fallback-marked`.
  - A value missing in both languages shows as not set: `bilingual-content.none-set`.

The CV's check for missing translations before generating is in task 036.
