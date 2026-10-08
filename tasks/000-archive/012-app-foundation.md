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

## Outcome

- Signed-in URLs start with the organization's slug, so each tab keeps its organization
  (`docs/architecture.md`, "Tenancy"). `/` opens the session's active organization.
- Menu items follow permissions through one shared check (`roleHasPermission`), with a
  new `projectRole` permission for the Roles page. A group with one visible item loses its
  heading, which gives employees the short list from the prototype.
- Fixed: the language switch didn't reload after saving the choice, because the save's
  response already set the cookie and Paraglide saw no change. The reload is explicit.
- Fixed: axe flagged the open menus; Radix menus are modal by default and hid a page with
  focusable links. The frame's menus are non-modal.
- Verified in the browser at desktop and phone width, as admin and employee: switching
  organization, switching language, signing out, the phone menu closing on navigation,
  and axe clean in each state.
- The local database had only the demo organization; `db:seed` added the other two.
