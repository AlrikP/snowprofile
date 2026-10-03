// The app frame around a signed-in page, and the prototype bar that switches a page's state.
import { pageLocale } from './ui'

type Role = 'admin' | 'employee'
type Organization = { name: string; initials: string; role: Role }
type NavItem = { id: string; icon: string; label: string; href?: string }

// Fictional users from the demo seed (src/db/seed.ts); the role switch picks one.
const users: Record<Role, { name: string; email: string; organizations: Organization[] }> = {
  admin: {
    name: 'Anna Admin',
    email: 'admin@demo.example.com',
    organizations: [
      { name: 'Demo Software', initials: 'DS', role: 'admin' },
      { name: 'Rabasaare Digital', initials: 'RD', role: 'admin' },
    ],
  },
  employee: {
    name: 'Erik Employee',
    email: 'employee@demo.example.com',
    organizations: [{ name: 'Demo Software', initials: 'DS', role: 'employee' }],
  },
}

// Pages without an href aren't prototyped yet.
const profile: NavItem = { id: 'profile', icon: 'UserIcon', label: 'nav_my_profile', href: 'frame.html' }
const projects: NavItem = { id: 'projects', icon: 'FolderKanbanIcon', label: 'nav_projects' }
const technologies: NavItem = { id: 'technologies', icon: 'CpuIcon', label: 'nav_technologies' }

const navigation: Record<Role, { label?: string; items: NavItem[] }[]> = {
  admin: [
    { items: [profile] },
    {
      label: 'nav_group_work',
      items: [
        projects,
        { id: 'people', icon: 'UsersIcon', label: 'nav_people' },
        { id: 'search', icon: 'SearchIcon', label: 'nav_search' },
        { id: 'cvs', icon: 'FileTextIcon', label: 'nav_cvs' },
      ],
    },
    {
      label: 'nav_group_organization',
      items: [
        { id: 'members', icon: 'UserCogIcon', label: 'nav_members' },
        technologies,
        { id: 'criteria', icon: 'ListChecksIcon', label: 'nav_tender_criteria' },
        { id: 'import', icon: 'UploadIcon', label: 'nav_import' },
      ],
    },
  ],
  employee: [{ items: [profile, projects, technologies] }],
}

export function pageRole(): Role {
  return new URLSearchParams(location.search).get('role') === 'employee' ? 'employee' : 'admin'
}

// A link to this page with changed params, or to another page in the same language and
// role. Other params, such as state, belong to the page.
function withState(href: string, changes: Record<string, string> = {}) {
  const current = new URLSearchParams(location.search)
  const params = href ? new URLSearchParams() : current
  if (href) {
    for (const key of ['lang', 'role']) {
      const value = current.get(key)
      if (value) params.set(key, value)
    }
  }
  for (const [key, value] of Object.entries(changes)) params.set(key, value)
  const query = params.toString()
  return `${href || location.pathname.split('/').pop()}${query ? `?${query}` : ''}`
}

// Plain links and forms between pages keep the language and role; <a data-locale="en">
// switches the language, styled as the app's language switch.
function connectPages() {
  for (const link of document.querySelectorAll<HTMLAnchorElement>('a[href$=".html"]')) {
    link.href = withState(link.getAttribute('href') ?? '')
  }
  for (const form of document.querySelectorAll<HTMLFormElement>('form[action]')) {
    form.addEventListener('submit', (event) => {
      event.preventDefault()
      location.href = withState(form.getAttribute('action') ?? '')
    })
  }
  for (const link of document.querySelectorAll<HTMLAnchorElement>('a[data-locale]')) {
    const current = link.dataset.locale === pageLocale()
    link.href = withState('', { lang: link.dataset.locale ?? 'et' })
    link.dataset.variant = current ? 'secondary' : 'ghost'
    if (current) link.setAttribute('aria-current', 'true')
  }
}

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
}

function organizationMark(organization: Organization) {
  return `<span aria-hidden="true" class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">${organization.initials}</span>`
}

function organizationText(organization: Organization) {
  return `<span class="grid flex-1 text-left leading-tight">
    <span class="truncate font-medium">${organization.name}</span>
    <span class="truncate text-xs text-sidebar-foreground/70" data-t="role_${organization.role}"></span>
  </span>`
}

function organizationSwitcher(prefix: string, role: Role) {
  const [active, ...others] = users[role].organizations
  if (!active) return ''
  if (others.length === 0) {
    return `<div class="flex h-12 items-center gap-2 p-2 text-sm">${organizationMark(active)}${organizationText(active)}</div>`
  }
  const items = users[role].organizations
    .map(
      (organization) => `<a href="#" data-slot="dropdown-menu-item" role="menuitemradio"
        aria-checked="${organization === active}" class="gap-2 p-2">
        ${organizationMark(organization).replace('size-8', 'size-6')}
        <span class="flex-1">${organization.name}</span>
        ${organization === active ? '<i data-icon="CheckIcon" class="ml-auto"></i>' : ''}
      </a>`,
    )
    .join('')
  return `<button data-slot="sidebar-menu-button" data-size="lg" popovertarget="${prefix}organizations"
      aria-haspopup="menu">
      ${organizationMark(active)}${organizationText(active)}
      <span class="sr-only" data-t="organization_switch_label"></span>
      <i data-icon="ChevronsUpDownIcon" class="ml-auto"></i>
    </button>
    <div popover id="${prefix}organizations" role="menu" data-slot="dropdown-menu-content" class="w-60">
      <div data-slot="dropdown-menu-label" class="text-xs text-muted-foreground" data-t="organizations_heading"></div>
      ${items}
    </div>`
}

function navigationGroups(prefix: string, page: string, role: Role) {
  return navigation[role]
    .map(
      (group) => `<nav class="flex flex-col gap-1 p-2"${group.label ? ` aria-labelledby="${prefix}${group.label}"` : ''}>
        ${group.label ? `<div data-slot="sidebar-group-label" id="${prefix}${group.label}" data-t="${group.label}"></div>` : ''}
        ${group.items
          .map(
            (item) => `<a data-slot="sidebar-menu-button" href="${item.href ? withState(item.href) : '#'}"
              ${item.id === page ? 'aria-current="page"' : ''}
              ${item.href ? '' : 'title="Not prototyped yet"'}>
              <i data-icon="${item.icon}"></i><span data-t="${item.label}"></span>
            </a>`,
          )
          .join('')}
      </nav>`,
    )
    .join('')
}

function userMenu(prefix: string, role: Role) {
  const user = users[role]
  const avatar = `<span data-slot="avatar" class="rounded-lg" aria-hidden="true"><span data-slot="avatar-fallback" class="rounded-lg bg-sidebar-accent text-sidebar-accent-foreground">${initials(user.name)}</span></span>`
  const language = (locale: 'et' | 'en', name: string) => {
    const checked = pageLocale() === locale
    return `<a href="${withState('', { lang: locale })}" data-slot="dropdown-menu-radio-item"
        role="menuitemradio" aria-checked="${checked}" lang="${locale}">
        <span class="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
          ${checked ? '<i data-icon="CircleIcon" class="size-2 fill-current"></i>' : ''}
        </span>${name}
      </a>`
  }
  return `<button data-slot="sidebar-menu-button" data-size="lg" popovertarget="${prefix}user"
      aria-haspopup="menu">
      ${avatar}
      <span class="sr-only" data-t="user_menu_label"></span>
      <span class="grid flex-1 text-left leading-tight">
        <span class="truncate font-medium">${user.name}</span>
        <span class="truncate text-xs text-sidebar-foreground/70">${user.email}</span>
      </span>
      <i data-icon="ChevronsUpDownIcon" class="ml-auto"></i>
    </button>
    <div popover id="${prefix}user" role="menu" data-slot="dropdown-menu-content" class="w-60">
      <div data-slot="dropdown-menu-label" class="text-xs text-muted-foreground" data-t="language_label"></div>
      ${language('et', 'Eesti')}${language('en', 'English')}
      <div data-slot="dropdown-menu-separator" role="separator"></div>
      <a href="${withState('sign-in.html')}" data-slot="dropdown-menu-item" role="menuitem">
        <i data-icon="LogOutIcon"></i><span data-t="sign_out"></span>
      </a>
    </div>`
}

// The product name in Snowhound's style, as on snowhound.eu's header.
export function wordmark(size = 'text-2xl') {
  return `<span class="flex items-center gap-2">
    <img src="../public/snowhound-mark.png" alt="" class="size-8">
    <span class="font-heading ${size} leading-none font-bold tracking-tight text-white" data-t="app_name"></span>
  </span>`
}

function sidebar(prefix: string, page: string, role: Role) {
  return `<div class="px-4 pt-4 pb-2">${wordmark()}</div>
    <div class="p-2">${organizationSwitcher(prefix, role)}</div>
    <div class="flex min-h-0 flex-1 flex-col overflow-y-auto">${navigationGroups(prefix, page, role)}</div>
    <div class="border-t border-sidebar-border p-2">${userMenu(prefix, role)}</div>`
}

// Controls for the prototype's own state, kept visibly apart from the app.
export function prototypeBar(controls: { param: string; label: string; options: Record<string, string> }[]) {
  const params = new URLSearchParams(location.search)
  const groups = [
    { param: 'lang', label: 'Language', options: { et: 'ET', en: 'EN' } },
    ...controls,
  ].map((control) => {
    const current = params.get(control.param) ?? Object.keys(control.options)[0]
    const links = Object.entries(control.options)
      .map(
        ([value, label]) =>
          `<a href="${withState('', { [control.param]: value })}" class="rounded px-1.5 py-0.5 ${value === current ? 'bg-amber-200 font-semibold' : 'underline'}"${value === current ? ' aria-current="true"' : ''}>${label}</a>`,
      )
      .join('')
    return `<span class="flex items-center gap-1">${control.label}: ${links}</span>`
  })
  const bar = document.createElement('div')
  bar.className =
    'sticky top-0 z-20 flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-dashed border-amber-400 bg-amber-50 px-4 py-1 text-xs text-amber-950'
  bar.setAttribute('aria-label', 'Prototype controls')
  bar.setAttribute('role', 'region')
  bar.innerHTML = `<a href="${withState('index.html')}" class="font-semibold underline">Prototype</a>${groups.join('')}`
  document.body.prepend(bar)
  // The frame's sticky parts sit below the bar, whose height changes as it wraps.
  new ResizeObserver(() => {
    document.documentElement.style.setProperty('--prototype-bar', `${bar.offsetHeight}px`)
  }).observe(bar)
}

function startFrame(page: string, role: Role) {
  const main = document.querySelector('main')
  if (!main) throw new Error('A framed page puts its content in <main>.')
  const frame = document.createElement('div')
  frame.className = 'flex min-h-[calc(100svh-var(--prototype-bar))]'
  frame.innerHTML = `
    <aside class="sticky top-(--prototype-bar) hidden h-[calc(100svh-var(--prototype-bar))] w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      ${sidebar('d-', page, role)}
    </aside>
    <div class="flex min-w-0 flex-1 flex-col">
      <header class="sticky top-(--prototype-bar) z-10 flex h-14 items-center gap-3 bg-sidebar px-4 text-sidebar-foreground md:hidden">
        <button data-slot="button" data-variant="ghost" data-size="icon"
          class="-ml-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          commandfor="navigation-sheet" command="show-modal" data-t-label="nav_open_menu">
          <i data-icon="MenuIcon"></i>
        </button>
        ${wordmark('text-xl')}
        <span class="ml-auto truncate text-sm">${users[role].organizations[0]?.name}</span>
      </header>
    </div>
    <dialog id="navigation-sheet" data-slot="sheet-content" class="bg-sidebar text-sidebar-foreground"
      data-t-label="nav_menu">
      <div class="flex justify-end px-2 pt-2">
        <button data-slot="button" data-variant="ghost" data-size="icon-sm"
          class="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          commandfor="navigation-sheet" command="close" data-t-label="nav_close_menu">
          <i data-icon="XIcon"></i>
        </button>
      </div>
      ${sidebar('m-', page, role)}
    </dialog>`
  frame.children[1]?.append(main)
  main.classList.add('flex-1')
  document.body.prepend(frame)
}

// <body data-frame="<nav id>"> wraps <main> in the app frame, with a role switch.
// <body data-states="demo:Demo mode|google:Google only"> adds a state switch; an element
// with data-show-in="demo google" shows only in those states. The first state is the
// default.
export function startPrototype() {
  const { frame, states } = document.body.dataset
  connectPages()
  const controls = []
  if (frame !== undefined) {
    startFrame(frame, pageRole())
    controls.push({ param: 'role', label: 'Role', options: { admin: 'Admin', employee: 'Employee' } })
  }
  if (states) {
    const options = Object.fromEntries(states.split('|').map((state) => state.split(':')))
    const current = new URLSearchParams(location.search).get('state') ?? Object.keys(options)[0]
    for (const element of document.querySelectorAll<HTMLElement>('[data-show-in]')) {
      element.hidden = !element.dataset.showIn?.split(' ').includes(current ?? '')
    }
    controls.push({ param: 'state', label: 'State', options })
  }
  prototypeBar(controls)
}
