# 023: Behavior specs

Status: todo

Record what each feature does in a living spec, one per capability, after OpenSpec's
capability specs. Today a feature's behavior is spread over a scope row in
`docs/product.md`, an archived task's acceptance criteria, and the code, and later tasks
change it without updating any of them. Scenarios in the specs also give each test a
behavior to cite. Task 017 writes the feature tasks against this format.

## Acceptance criteria

- [ ] `docs/specs/README.md` defines the format: one file per capability, named after its
      row in the MVP scope table; requirements stated with must, should, or can; one or
      more scenarios per requirement (given, when, then), each with a stable ID that tests
      cite. Specs describe behavior a user or client can observe, never tables,
      components, or libraries.
- [ ] `tasks/README.md` describes a "Spec changes" section (added, modified, and removed
      requirements) for tasks that change behavior. The section is reviewed with the
      task, and the commit that implements it applies it to the spec.
- [ ] `docs/specs/sign-in.md` specifies the implemented sign-in behavior as the worked
      example, and its scenarios cite the existing tests. `docs/architecture.md`
      ("Sign-in modes") keeps the reasons and the implementation and links to the spec
      instead of repeating the behavior.
- [ ] A script check fails when a scenario has no test citing its ID or a test cites an
      unknown ID. It runs in the pre-commit hook and as a CI step, and `AGENTS.md` lists
      it in the commands table.
- [ ] Decided with the user and recorded in `docs/architecture.md` (the Tests row):
      whether scenarios run through a Gherkin runner (for example `playwright-bdd`) or as
      plain `bun test`, Vitest, and Playwright tests that cite scenario IDs. The
      recommendation is plain tests, because most scenarios are server rules best checked
      in `bun test`, and a Gherkin runner adds step definitions and a second copy of each
      scenario.
- [ ] `docs/architecture.md` records the decision to keep specs in `docs/specs/` rather
      than adopt the OpenSpec tool: the tool has no task dependencies, doesn't fit
      infrastructure work, and its generated agent instructions would compete with
      `AGENTS.md`.
- [ ] `AGENTS.md` indexes `docs/specs/`, and the google-style skill's "Where things go"
      names it.
