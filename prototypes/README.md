# UI prototypes

Static HTML prototypes of the MVP views. They settle layout and flow before a feature is
built, and their markup ports to the React components directly. Open
[`index.html`](index.html) for the list.

## Build and open

```bash
bun run prototypes:build           # writes prototypes/build/ (gitignored)
bun run prototypes:build --watch   # rebuilds the CSS and script on change
```

Then open a page from disk, for example `file:///<repository>/prototypes/frame.html`. No
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

The button, input, and label classes copy `src/components/ui/`. The others (card, badge,
alert, avatar, separator, dropdown menu, sheet, sidebar) copy shadcn's `new-york`
registry until task 012 adds them to the app. Behavior uses the platform instead of
Radix: a dropdown menu is a native `popover`, a sheet a modal `<dialog>` opened with
`commandfor` and `command="show-modal"`. Focus handling and animations aren't reproduced.

### Icons and texts

- `<i data-icon="FolderKanbanIcon"></i>` becomes that Lucide icon. Add a new one to
  `lib/icons.ts` under the name the app imports it by.
- `data-t="key"` sets an element's text from `messages/` or `lib/messages.ts`, in the
  page's language; `data-t-params` fills the message's parameters, and `data-t-label`
  sets an `aria-label`. A key in `lib/messages.ts` that `messages/` also has is a
  proposed change to that message.

### States

A bar above each page, styled apart from the app, switches the page's language (`lang`),
the signed-in role (`role`, on framed pages), and the page's own states (`state`). Each
is a URL parameter, so a state has its own link. Links between pages keep the language
and role.

- `<body data-frame="profile">` wraps the page's `<main>` in the app frame, with that
  navigation item active.
- `<body data-states="demo:Demo mode|google:Google only">` lists the page's states; the
  first is the default. An element with `data-show-in="demo google"` shows only in those.

The data is fictional and follows the demo seed (`src/db/seed.ts`). Pages show the
Snowhound mark from `public/`, as the app will.
