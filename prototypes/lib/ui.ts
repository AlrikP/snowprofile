// Gives prototype markup the classes shadcn's components render. An element names its
// component with data-slot, and its props with data-variant and data-size, as the React
// component's own DOM does; its class attribute is merged in last, like className.
// Button, input, and label copy src/components/ui/; the others copy shadcn's new-york
// registry until task 012 adds them to the app.
import { cn } from 'cn'
import en from '../../messages/en.json'
import et from '../../messages/et.json'
import { prototypeMessages } from './messages'

declare global {
  interface Window {
    prototypeIcons?: Record<string, string>
  }
}

type Slot = {
  base: string
  variant?: Record<string, string>
  size?: Record<string, string>
}

const focusRing = 'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'
const invalid =
  'aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40'
const menuItem =
  "relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground"
const sidebarButton =
  "flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 aria-[current=page]:bg-sidebar-accent aria-[current=page]:font-medium aria-[current=page]:text-sidebar-primary [&>svg]:size-4 [&>svg]:shrink-0"

const slots: Record<string, Slot> = {
  button: {
    base: `inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none ${focusRing} disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 ${invalid} [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4`,
    variant: {
      default: 'bg-primary text-primary-foreground hover:bg-primary/90',
      destructive:
        'bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40',
      outline:
        'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      ghost: 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
      link: 'text-primary underline-offset-4 hover:underline',
    },
    size: {
      default: 'h-9 px-4 py-2 has-[>svg]:px-3',
      sm: 'h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5',
      lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
      icon: 'size-9',
      'icon-sm': 'size-8',
    },
  },
  input: {
    base: `h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30 ${focusRing} ${invalid}`,
  },
  label: {
    base: 'flex items-center gap-2 text-sm leading-none font-medium select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
  },
  card: {
    base: 'flex flex-col gap-6 rounded-xl border bg-card py-6 text-card-foreground shadow-sm',
  },
  'card-header': {
    base: 'grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6',
  },
  'card-title': { base: 'leading-none font-semibold' },
  'card-description': { base: 'text-sm text-muted-foreground' },
  'card-content': { base: 'px-6' },
  'card-footer': { base: 'flex items-center px-6 [.border-t]:pt-6' },
  badge: {
    base: 'inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3',
    variant: {
      default: 'border-transparent bg-primary text-primary-foreground',
      secondary: 'border-transparent bg-secondary text-secondary-foreground',
      destructive: 'border-transparent bg-destructive text-white',
      outline: 'text-foreground',
    },
  },
  alert: {
    base: 'relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-lg border px-4 py-3 text-sm has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-3 [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current',
    variant: {
      default: 'bg-card text-card-foreground',
      destructive:
        'bg-card text-destructive *:data-[slot=alert-description]:text-destructive/90 [&>svg]:text-current',
    },
  },
  'alert-title': { base: 'col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight' },
  'alert-description': {
    base: 'col-start-2 grid justify-items-start gap-1 text-sm text-muted-foreground [&_p]:leading-relaxed',
  },
  avatar: { base: 'relative flex size-8 shrink-0 overflow-hidden rounded-full' },
  'avatar-fallback': {
    base: 'flex size-full items-center justify-center rounded-full bg-muted text-xs',
  },
  separator: { base: 'h-px w-full shrink-0 bg-border' },
  'dropdown-menu-content': {
    base: 'z-50 min-w-[8rem] overflow-x-hidden overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
  },
  'dropdown-menu-item': { base: menuItem },
  'dropdown-menu-radio-item': { base: `${menuItem} pl-8` },
  'dropdown-menu-label': { base: 'px-2 py-1.5 text-sm font-medium' },
  'dropdown-menu-separator': { base: '-mx-1 my-1 h-px bg-border' },
  'sheet-content': {
    base: 'fixed inset-y-0 left-0 m-0 hidden h-full max-h-none w-3/4 flex-col border-r bg-background p-0 shadow-lg backdrop:bg-black/50 open:flex sm:max-w-sm',
  },
  'sidebar-menu-button': {
    base: sidebarButton,
    size: { default: 'h-8', lg: 'h-12' },
  },
  'sidebar-group-label': {
    base: 'flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70',
  },
}

// The page's language: ?lang=en or ?lang=et, Estonian by default as in the app.
export function pageLocale(): 'et' | 'en' {
  return new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'et'
}

const texts: Record<string, string> = {
  ...(pageLocale() === 'en' ? en : et),
  ...prototypeMessages[pageLocale()],
}

export function t(key: string, params: Record<string, string> = {}): string {
  const text = texts[key] ?? `[${key}]`
  return text.replace(/\{(\w+)\}/g, (_, name: string) => params[name] ?? `{${name}}`)
}

function applySlot(element: HTMLElement) {
  const slot = slots[element.dataset.slot ?? '']
  if (!slot || element.dataset.styled) return
  const variant = slot.variant?.[element.dataset.variant ?? 'default']
  const size = slot.size?.[element.dataset.size ?? 'default']
  element.className = cn(slot.base, variant, size, element.className)
  element.dataset.styled = ''
}

function applyIcon(element: HTMLElement) {
  const svg = window.prototypeIcons?.[element.dataset.icon ?? '']
  if (!svg) throw new Error(`Unknown icon ${element.dataset.icon}; add it to prototypes/lib/icons.ts.`)
  const template = document.createElement('template')
  template.innerHTML = svg
  const icon = template.content.firstElementChild as SVGElement
  icon.setAttribute('class', cn(icon.getAttribute('class'), element.className))
  icon.setAttribute('aria-hidden', 'true')
  element.replaceWith(icon)
}

// data-t="key" sets the text, with data-t-params='{"name": "…"}' for its parameters, where
// [[key]] stands for another message; data-t-label="key" sets the aria-label.
function applyText(element: HTMLElement) {
  const raw = JSON.parse(element.dataset.tParams ?? '{}') as Record<string, string>
  const params = Object.fromEntries(
    Object.entries(raw).map(([name, value]) => [
      name,
      value.replace(/\[\[(\w+)\]\]/g, (_, key: string) => t(key)),
    ]),
  )
  if (element.dataset.t) element.textContent = t(element.dataset.t, params)
  if (element.dataset.tLabel) element.setAttribute('aria-label', t(element.dataset.tLabel))
}

export function applyUi(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('[data-icon]').forEach(applyIcon)
  root.querySelectorAll<HTMLElement>('[data-t], [data-t-label]').forEach(applyText)
  root.querySelectorAll<HTMLElement>('[data-slot]').forEach(applySlot)
}

// A dropdown menu is a native popover; this places it at its trigger, as Radix does:
// below, or above when it doesn't fit, aligned by data-align (start or end). It places the
// menu before it opens, to avoid a flash in the middle, and again once open, when its height
// is known.
function placeMenus() {
  let trigger: HTMLElement | null = null
  document.addEventListener('click', (event) => {
    trigger = (event.target as HTMLElement).closest('[popovertarget]')
  })
  function place(event: Event) {
    const menu = event.target as HTMLElement
    if ((event as ToggleEvent).newState !== 'open' || !trigger) return
    const anchor = trigger.getBoundingClientRect()
    Object.assign(menu.style, { position: 'fixed', margin: '0', inset: 'auto' })
    const width = Math.max(menu.offsetWidth, anchor.width)
    const height = menu.offsetHeight
    const below = anchor.bottom + 4
    const top = below + height > innerHeight ? anchor.top - 4 - height : below
    const left =
      menu.dataset.align === 'end'
        ? anchor.right - width
        : Math.min(anchor.left, innerWidth - width - 8)
    Object.assign(menu.style, {
      top: `${Math.max(8, top)}px`,
      left: `${Math.max(8, left)}px`,
      minWidth: `${anchor.width}px`,
    })
  }
  document.addEventListener('beforetoggle', place, true)
  document.addEventListener('toggle', place, true)
}

export function startUi() {
  document.documentElement.lang = pageLocale()
  applyUi()
  placeMenus()
}
