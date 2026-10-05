# 012: App foundation

Status: done
Depends on: task 010 (UI strings), task 011.6 (the reviewed frame prototype)

Turn the frame prototype into the app's shell, so feature tasks only add pages.

## Acceptance criteria

- [x] The scaffold's welcome page is replaced; the app frame from the prototype wraps
      every signed-in page, with the organization and language switchers.
- [x] shadcn components are added as the frame needs them, and the shadcn version used
      is recorded in `architecture.md`.
- [x] One `cn` helper remains: the `cn` package or `src/lib/utils.ts`, not both.
- [x] Strings come from Paraglide messages in both locales.
- [x] A component test covers the frame.
- [x] Checked with the `ui-review` skill against the prototype.
