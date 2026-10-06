# 025: Form inputs and bilingual content

Status: done

Build the inputs that several feature forms share, so the feature tasks can run in
parallel instead of each building its own: the period input, the approximate number
input, and the bilingual field. They go in `src/components/` and `src/lib/`, because more
than one feature needs them (`AGENTS.md`, "Code conventions").

Builds on: `docs/architecture.md` ("Data conventions": periods, approximate numbers,
bilingual text); `prototypes/project-edit.html` (period with day, month, and year; hours
and cost with a qualifier; ET/EN description) and its `year-only` and `invalid-period`
states.

## Acceptance criteria

- [x] A period input takes a day, month, and year, any of day and month left empty, and an
      Ongoing checkbox. It produces `YYYY-MM-DD`, `YYYY-MM`, or `YYYY` and an end of null
      while ongoing. Saving with Ongoing ticked clears the end date; ticking it alone
      doesn't (carried from task 011.6).
- [x] The period input rejects a day without a month, an impossible date, and an end
      before the start compared on the end's precision, with the same rule as the
      database `CHECK`.
- [x] A shared Valibot schema for periods and approximate numbers in `src/server/schemas.ts`,
      so every server function validates them the same way.
- [x] An approximate number input: a value and a qualifier (`exact`, `approximately`,
      `more_than`), the qualifier required exactly when the value is set.
- [x] A bilingual field shows an Estonian and an English input, labelled by language,
      either one optional unless the form requires one.
- [x] Display helpers: a period formatted as `DD-MM-YYYY`, `MM-YYYY`, or `YYYY` with an
      open end while ongoing, an approximate number with its qualifier, and a bilingual
      value in the UI language, falling back to the other language with a "translation
      missing" mark.
- [x] Component tests cover each input and the fallback.

## Spec changes

- Added: `docs/specs/bilingual-content.md`, with requirements:
  - Both languages are editable: `bilingual-content.both-languages-editable`.
  - A missing translation shows the other language, marked as missing:
    `bilingual-content.fallback-marked`.
  - A value missing in both languages shows as not set: `bilingual-content.none-set`.

The CV's check for missing translations before generating is in task 036.

## Outcome

- Each input is controlled with a form-side value (`PeriodInputValue`,
  `ApproximateNumberInputValue`, `BilingualInputValue`) and a parse function in `src/lib/`
  that turns it into what the server stores, or field errors. Parsing on save is what
  clears the end when Ongoing is ticked, so the input itself only disables the end fields.
- The server schemas in `src/server/schemas.ts` are `Period`, `ApproximateNumber`,
  `Bilingual`, and `RequiredBilingual`. A period with an optional start, which education
  needs, is left to task 030.
- `QUALIFIERS` is defined again in `src/lib/approximate-number.ts`, because client code
  can't import `src/db/schema.ts`; a test keeps it equal to the database's, as
  `messages.test.ts` does for locales.
- The format helpers take an optional locale, because `bun test` runs in Estonian and
  component tests in English.
- Texts moved from `prototypes/lib/messages.ts` to `messages/`, and the project-only keys
  became generic: `project_start` → `period_start`, `project_end` → `period_end`,
  `project_ongoing` → `period_ongoing_label`, `project_period_*` → `period_*`, and
  `profile_not_set` → `value_not_set`. The prototypes use the new keys.
- shadcn's `native-select` and `badge` were added; the native select's wrapper is
  `w-full` instead of `w-fit`, as in the prototypes, so it fills its grid cell.
- No page uses the inputs yet, so they get their browser check (`ui-review`) with the
  first form, in task 029.2.
