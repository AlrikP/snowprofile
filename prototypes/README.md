# UI prototypes

Static HTML prototypes of the MVP views. They settle layout and flow before a feature is
built, and their markup ports to the React components directly. Open
[`index.html`](index.html) for the list.

## Build and open

```bash
bun run prototypes:build           # writes prototypes/build/ (gitignored)
bun run prototypes:build --watch   # rebuilds the CSS and script on change
```

Then open a page from disk, for example `file:///<repository>/prototypes/profile.html`. No
server is needed, and the pages load nothing from the network. Rebuild after changing a
page's classes or anything in `lib/`; the watch mode rebuilds everything but the icons.

Check pages with the agent-browser CLI as
[`docs/skills/ui-review/SKILL.md`](../docs/skills/ui-review/SKILL.md) describes, at
desktop and phone widths.

## How a page is built

| Piece                                  | Role                                                                                                         |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| [`prototype.css`](prototype.css)       | Imports the app's `src/styles.css`, with Snowhound's colors and fonts; the Tailwind CLI adds the classes used in `prototypes/` |
| [`lib/ui.ts`](lib/ui.ts)               | shadcn component classes by `data-slot`, merged with the app's `cn`; texts; menu placement                   |
| [`lib/frame.ts`](lib/frame.ts)         | The app frame (navigation, organization switcher, user menu) and the prototype bar                           |
| [`lib/messages.ts`](lib/messages.ts)   | Texts the app doesn't have yet, as proposed Paraglide messages; the rest come from `messages/`               |
| [`lib/icons.ts`](lib/icons.ts)         | The Lucide icons pages use; the build renders them to SVG from `lucide-react`                                |
| `scripts/prototypes-build.ts`          | Builds `build/prototype.css` with its font files, `build/prototype.js`, and `build/icons.js`                 |

Every page loads the same three files in `<head>`:

```html
<link rel="stylesheet" href="build/prototype.css" />
<script src="build/icons.js"></script>
<script src="build/prototype.js"></script>
```

### Components

An element names its shadcn component with `data-slot`, and the component's props with
`data-variant` and `data-size`, the attributes the React component renders. `lib/ui.ts`
adds the component's classes, then the element's own `class`, as `className` would be
merged:

```html
<button data-slot="button" data-variant="outline" data-size="sm">Export</button>
<!-- <Button variant="outline" size="sm">Export</Button> -->
```

The button, input, label, and textarea classes copy `src/components/ui/`. The others
(card, badge, alert, avatar, separator, table, dialog, native select, dropdown menu, sheet,
sidebar, toggle group) copy shadcn's `new-york` registry until task 012 adds them to the
app. A checkbox is a native one in navy, and a toggle group is a row of native radios. Behavior uses the
platform instead of Radix: a dropdown menu is a native `popover`, and a dialog or sheet a
modal `<dialog>` opened with `commandfor` and `command="show-modal"`. Focus handling and
animations aren't reproduced.

A row's action menu is named for its row (`data-t-label="action_actions_for"` with the
row's name), so a screen reader can tell the menus apart.

### Icons and texts

- `<i data-icon="FolderKanbanIcon"></i>` becomes that Lucide icon. Add a new one to
  `lib/icons.ts` under the name the app imports it by.
- `data-t="key"` sets an element's text from `messages/` or `lib/messages.ts`, in the
  page's language; `data-t-params` fills the message's parameters, and `data-t-label` and
  `data-t-placeholder` set an `aria-label` and a placeholder. A key in `lib/messages.ts`
  that `messages/` also has is a proposed change to that message.
- Content the server would send stays data, not a message, and is formatted for the
  page's language: `data-date="2026-10-05"`, `data-number="4200"`, `data-euros="250000"`,
  and `data-period="2024-03/"` (a period as precise as known, open-ended while ongoing).
  `data-et`/`data-en` hold a bilingual field, showing the other language when one is
  missing.

### States

A bar above each page, styled apart from the app, switches the page's language (`lang`),
the signed-in role (`role`, on framed pages), and the page's own states (`state`). Each
is a URL parameter, so a state has its own link. Links between pages keep the language
and role.

- `<body data-frame="profile">` wraps the page's `<main>` in the app frame, with that
  navigation item active.
- `<body data-roles="admin">` limits the role switch to the roles that see the page; an
  element with `data-role="admin"` shows only for that role.
- `<body data-states="demo:Demo mode|google:Google only">` lists the page's states; the
  first is the default. In a state:
  - an element with `data-show-in="demo google"` shows only in those states;
  - a `<dialog data-open-in="add">` opens;
  - an input with `data-state-values='{"duplicate": "Postgres"}'` holds that value;
  - an element with `data-invalid-in="<state>"` is marked `aria-invalid`, and a combobox
    with `data-expanded-in="<state>"` is `aria-expanded`.
- A form or button with `data-goto-state="link"` shows that state, as the app would after
  the action.
- A checkbox with `data-goto-state` is a filter: it's ticked in that state, and unticking it
  returns to the page's first state.

The data is fictional and follows the demo seed (`src/db/seed.ts`). Pages show the
Snowhound mark from `public/`, as the app will.
