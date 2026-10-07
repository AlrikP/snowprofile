---
name: cr-review
description: Comprehensive code review of everything committed since the last cr- review task, ending in the next cr- task folder with the review report. Verifies that the previous review's fixes still hold, runs every check, reviews the new work area by area, and reports verified findings. Use only when the user asks for the periodic review or a cr- review.
argument-hint: '[end-commit, default HEAD]'
disable-model-invocation: true
---

# Comprehensive code review

This review covers every commit since the last code review. It verifies that the
previous review's fixes hold, reviews the new work, and writes the next `cr-` task.

It is a review only. Write nothing in the repository except the new task folder (section
9), don't commit, and don't start the dev server. Commands that build, test, or write to
a scratch directory are fine.

If the user asks for subagents, split section 6 by area among them, and verify every
finding they return yourself in section 7. Otherwise run the whole review in one session.

## 0. Find the range

1. The previous review is the highest-numbered `cr-NNN` task in `tasks/` or
   `tasks/000-archive/`. Call its number N, and the new review N+1.
2. The previous review's `README.md` records its range as `<start>..<end>`. The new
   range starts after that end commit: `<end>..<new end>`. It includes the commit that
   added the previous review's task, and its fix commits.
3. The new range ends at the commit the user named, or at `HEAD`.
4. The last feature task in the range names the new task folder:
   `cr-<N+1>-review-cr<N>-<last task number>`, for example `cr-003-review-cr002-039`.

State the range as hashes and as commit subjects before going on.

## 1. Preconditions

- The working tree is clean.
- List the tasks and subtasks the range's commit subjects name. Each task file under
  `tasks/` or `tasks/000-archive/` says `Status: done`, with two exceptions that don't
  stop the review:
  - A task that is `in-progress` and whose only unticked criteria are manual checks.
    List the checks for the user in the report.
  - A parent task that is `in-progress` because later subtasks have no commits in the
    range. Review those subtasks as plans.
- Any other gap: list what's missing and stop.
- Task files the range adds or edits without code are plans. Review them as plans, not
  as code.

## 2. Load context

Read `AGENTS.md`, `docs/product.md`, `docs/architecture.md`, `docs/hosting.md`,
`docs/deployment.md`, `docs/migrations.md`, `docs/specs/README.md` and every spec in
`docs/specs/`, `tasks/README.md`, every file of the previous review's task, and every
task file for the tasks in the range. Use these as the spec. When code and docs disagree,
it's a finding either way. Say which side looks wrong.

## 3. Triage the range

Before reviewing, map where the risk is, so the effort in section 6 goes there. List:

- **Entry points:** new or changed server functions, server routes under
  `src/routes/api/`, and routes reachable without a session. For each, the middleware
  and the permission check it uses.
- **Data access:** new or changed repositories, migrations, and queries that join across
  tables.
- **Shared code with a wide reach:** changes to middleware, `src/lib/permissions.ts`,
  auth configuration, `src/env.ts`, and shared components. Count their callers, and
  review the callers a change can break.
- **Removed code:** deleted or loosened scope conditions, permission checks, demo-mode
  refusals, validation, and tests (`git diff` lines starting with `-`, and new
  `.skip`, `.todo`, or commented-out tests). For each removal, find the reason in the
  commit or task. A removal with no reason is a finding.
- **New dependencies, scripts, environment variables, and inline lint disables.**
- **Personal data:** code that reads, exports, logs, or imports people's data.

Classify each changed area as high, medium, or low risk, and give the list in the report
as "Risk map". The areas in [checklist.md](checklist.md) marked as high risk start high.

## 4. Verify the previous review's fixes

For each acceptance criterion of task cr-N and its subtasks. A clean review leaves a task
with no subtasks; then say there is nothing to verify, and go on.

- Find the code, test, or doc change that meets it, and confirm it still holds at the end
  of the range. Later commits must not have undone it. Run the test that covers it where
  one exists.
- Mark it **verified**, **partly met** (say what's missing), **regressed** (name the
  commit that broke it), or **unmet**.
- Check that the previous review's doc-drift items and follow-up tasks went somewhere: a
  fix in the range, or a task file. List any that were dropped.
- Check that the previous review's task is archived per `tasks/README.md`, "Archive", or
  say why it can't be yet.

A criterion that is ticked but unmet or regressed is a finding, in the cr-N task's name.

## 5. Run the checks

Run each and report the result (exact failures, not summaries):
`bun run check`, `bun run test`, `bun run specs:check`, `bun run db:drift`,
`bun run db:verify`, `bun run datamodel:check`, `bun run build`, `bun run build:scripts`,
`bun run prototypes:build`, and `bun run test:e2e`. The e2e tests need
`bunx playwright install chromium`; if the browser can't be installed, say so and skip
them.

Then run `bun install`, `bun run check`, and `bun run test` again in a clean export of the
end commit (`git archive <end> | tar -x -C <scratch dir>`). A pass in the working copy
that fails in the export means a step depends on an untracked or generated file.

Also check that `.github/workflows/ci.yml` and `lefthook.yml` run what `AGENTS.md` says
they run, and that the "Running things" table matches `package.json`.

## 6. Review the new work

Go through each area in [checklist.md](checklist.md) separately, adding the range's
specifics from the risk map. Check the code itself, not only the diffs. Spend most of the
effort on the areas the risk map rates high.

## 7. Verify before reporting

For each candidate finding:

1. Read the code path end to end, from the entry point to the database or the screen.
2. Write the failure scenario: the input or state, and the wrong result. A finding with
   no concrete scenario is dropped.
3. Confirm it with a test, a script, or a command where you can. Label it **confirmed**
   (reproduced) or **traced** (read end to end, not run). Drop anything weaker, or list
   it under "Unverified" with what would confirm it.
4. Try to disprove it: look for a guard elsewhere (middleware, a database constraint, a
   caller's check) that already prevents the failure.

Don't report:

- Style preferences the conventions in `AGENTS.md` don't cover.
- What a linter or check already catches, unless the check itself fails to catch it.
  That is a finding about the check.
- Issues in code the range didn't touch, except high or critical ones. List those
  separately, as "Outside the range".

## 8. Report

The review is clean when it has no partly met, regressed, or unmet cr-N criteria, no
findings, no doc drift, nothing outside the range or unverified, and no follow-up tasks.
Open manual checks and coverage gaps don't count. A clean review writes no report;
section 9 records it in the task's `README.md`.

Otherwise, write the report to `review.md` in the new task folder. Start with a short
summary: the range, the check results, the cr-N verification result (counts of verified,
partly met, regressed, and unmet), the overall assessment, and the top three risks. Then
give:

1. The risk map from section 3.
2. The cr-N verification table from section 4, if cr-N had subtasks.
3. Findings, most severe first, each with:
   - **Severity:** critical, high, medium, or low, as defined below
   - **Area** (from [checklist.md](checklist.md), or "cr-N verification") and the
     **task** it belongs to
   - **Location:** `path:line`
   - **What's wrong**, the **failure scenario**, and the **evidence** (code quote,
     command output, or failing test), labeled confirmed or traced
   - **Suggested fix**, in one or two sentences
4. **Doc drift:** places where `docs/`, `docs/specs/`, or `AGENTS.md` and the code
   disagree.
5. **Open manual checks** from section 1.
6. **Outside the range** and **Unverified**, from section 7.
7. **Coverage:** what the review didn't cover or couldn't run, such as a skipped check or
   an area reviewed only from the diff.
8. **Follow-up tasks:** findings too large for a cr-<N+1> fix, written as proposed
   numbered task titles with one-line descriptions in the `tasks/README.md` format. Pick
   the numbers after the highest task in `tasks/` and `tasks/000-archive/`.

Severity:

| Severity | Meaning                                                                                       |
| -------- | --------------------------------------------------------------------------------------------- |
| critical | Data from another organization, an auth bypass, data loss, or a broken deploy or checkout     |
| high     | A role or demo-mode check that can be bypassed, a wrong result users rely on, a failing check |
| medium   | A ticked criterion that is unmet, a missing test for a risky path, an accessibility barrier   |
| low      | Doc drift, convention slips, dead code, small UI text issues                                  |

## 9. Write task cr-<N+1>

Write the task to `tasks/cr-<N+1>-review-cr<N>-<last task number>/`, in the format of the
previous review's task and `tasks/README.md`. Its `README.md` records the reviewed range
as `<start>..<end>`; the next review starts from that end commit.

A clean review writes only `README.md`:

- `# CR-<N+1>: Review of cr-<N> through task <last task>`, and `Status: done`.
- A short paragraph: the reviewed range (commit hashes), the review date, the check
  results, the cr-N verification result, and that the review found nothing to fix. Name
  any open manual checks and coverage gaps (for example, skipped e2e tests) in a
  sentence.

A review with findings writes `review.md` (section 8), and:

- `README.md`: `# CR-<N+1>: Fixes from the review of cr-<N> through task <last task>`,
  `Status: todo`, a short paragraph naming the reviewed range (commit hashes), the review
  date, the check results, what held up, and which feature task to fix these before (the
  next `todo` task in sequence). Link `review.md` for the full report. Then the subtask
  list and the criterion `- [ ] All subtasks are done.`
- One subtask file per group of related findings (`01-<slug>.md`, and so on), each with
  `# CR-<N+1>.M: Title`, `Status: todo`, a `Depends on` line only where one subtask
  blocks another, a one-line goal, and acceptance criteria. Each criterion states the
  fixed state, and then the current problem with its `path:line` and evidence. Order
  subtasks by severity, a clean checkout first if it's broken.
- Each subtask fits one reviewable commit (`task-cr-<N+1>.M: ...`). Leave out findings
  that went to follow-up tasks, and say in `review.md` where each went. Don't create the
  follow-up task files; `review.md` proposes them for the user.

`review.md` is a snapshot of the end commit. Don't update it as the fixes land; the
subtasks track their status.

Then stop. Give the user the summary, the list of files written, and a commit message:
`Add task cr-<N+1> with fixes from the review of cr-<N> through task <last task>`, or for
a clean review, `Record the clean review cr-<N+1> of cr-<N> through task <last task>`.
