# 022: Dark mode

Status: todo
Depends on: tasks 026, 027, 028, 029, 030, 031, 032, 033, 034, 035, 036, and 037 (the feature views)

After the MVP's feature views are built and stable, let a user pick light, dark, or the
system's setting (`docs/product.md`, "Not in MVP"). `src/styles.css` already has `.dark`
tokens in Snowhound's palette. snowhound.eu itself has no dark mode, so the tokens are our
own design and need a review of their own.

## Acceptance criteria

- [ ] The user menu offers light, dark, and system, beside the language choice.
- [ ] The choice is saved on the user and in a cookie, as the locale is, and the server
      renders the page in it, so it doesn't flash light first.
- [ ] The `.dark` tokens are checked against every view; contrast passes WCAG AA.
- [ ] The prototypes can show both modes, and the `ui-review` skill checks both.
- [ ] A component test covers the switch.
