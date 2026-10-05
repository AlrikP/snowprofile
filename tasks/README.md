# Tasks

Markdown-based task tracking. One file per task, or one folder for a task with
several subtasks or its own supporting files.

## Naming

`NNN-short-slug.md`: a zero-padded, sequential number plus a kebab-case slug,
for example `001-data-model.md`.

A task with subtasks or supporting files is a folder with the same name,
`NNN-short-slug/`, holding the task itself as `README.md` and one file per
subtask as `NN-short-slug.md`, numbered within the folder (for example
`006-environments/01-databases.md`). Subtasks use the same format as tasks.

Fixes from a code review are numbered in their own sequence with a `cr-` prefix, for
example `cr-001-review-001-010.md`; their commits use `task-cr-001`.

## Format

```markdown
# NNN: Title

Status: todo | in-progress | done
Depends on: task 003 (the tables this task reads)

Short description of what and why.

## Acceptance criteria

- [ ] Concrete, verifiable outcome
- [ ] ...

## Outcome

- What a later reader acts on, added when the task is done
```

Update the status line as work progresses; tick criteria as they are met.

The **Outcome** section records what the criteria and the commit message don't: findings
that surprised, alternatives tried and dropped, how the work was verified beyond the
automated checks, and what was left open and where it went. Keep it to about 5–10
bullets. A decision recorded in `docs/` gets a link there, not a second copy. Write what a
later reader needs, not the order the work happened in.

`Depends on` lists only blocking dependencies: tasks that must be done before this one
can start, each with the reason in a few words. Leave the line out when nothing blocks
the task. A task that merely benefits from another one mentions it in the description
instead.

## Working on a task

- Set the status to `in-progress` when you start, and check that every task in
  `Depends on` is done.
- If the work changes a recorded decision, update the doc in the same change or ask
  first (`AGENTS.md`).
- A decision the task leaves open, or new work it uncovers, becomes a new task rather
  than scope creep in this one.

## Finishing a task

One task, one reviewed commit. When the acceptance criteria are met:

1. Run the checks (lint, format, type check, tests) and fix what fails.
2. Set the status to `done`, tick the criteria, and write the Outcome section.
3. Stop and summarize for review: what changed, which docs were updated, anything left
   open and the task it went to. Suggest a commit message in the `AGENTS.md` convention
   (`task-NNN: ...`, or `task-NNN.M: ...` for a subtask).
4. Wait until the change is reviewed and committed before starting the next task. The
   user commits, unless `AGENTS.md` says the agent commits after review.

A task or subtask is one commit. If the work outgrows one reviewable commit, split the
task into subtasks first; each subtask then ends with its own commit, reviewed the same
way. Never let several tasks pile up in one uncommitted change.

## Archive

When a task is done and nothing still builds on its file, move it to `000-archive/` with
`git mv`, keeping its name. The main folder then lists only open work. Numbers stay
unique across both folders: pick the next number after the highest in either. Refer to
tasks by number ("task 008"), not by path, so a move breaks no reference.
