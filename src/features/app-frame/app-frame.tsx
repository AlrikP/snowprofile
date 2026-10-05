import { Link } from '@tanstack/react-router'
import { MenuIcon, XIcon } from 'lucide-react'
import { type ReactNode, useId, useState } from 'react'
import { Button } from '#/components/ui/button'
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from '#/components/ui/sheet'
import { m } from '#/paraglide/messages.js'
import type { Locale } from '#/paraglide/runtime.js'
import type { Frame, Membership } from '#/server/auth/auth.functions'
import { navigationFor } from './navigation'
import { OrganizationSwitcher } from './organization-switcher'
import { sidebarButton } from './sidebar-button'
import { UserMenu } from './user-menu'
import { Wordmark } from './wordmark'

type FrameProps = {
  frame: Frame
  organization: Membership
  onSwitchOrganization: (organization: Membership) => void
  saveLocale: (locale: Locale) => Promise<unknown>
  onSignOut: () => void
}

function Navigation({
  organization,
  onNavigate,
}: {
  organization: Membership
  onNavigate?: () => void
}) {
  const id = useId()
  return navigationFor(organization.role).map((group, index) => {
    const labelId = `${id}-${index}`
    return (
      <nav
        key={labelId}
        className="flex flex-col gap-1 p-2"
        aria-labelledby={group.label ? labelId : undefined}
      >
        {group.label && (
          <div
            id={labelId}
            className="text-sidebar-foreground/70 flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium"
          >
            {group.label()}
          </div>
        )}
        {group.items.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            params={{ organization: organization.slug }}
            className={sidebarButton()}
            onClick={onNavigate}
          >
            <Icon />
            <span>{label()}</span>
          </Link>
        ))}
      </nav>
    )
  })
}

function Sidebar({ onNavigate, ...props }: FrameProps & { onNavigate?: () => void }) {
  return (
    <>
      <div className="px-4 pt-4 pb-2">
        <Wordmark />
      </div>
      <div className="p-2">
        <OrganizationSwitcher
          current={props.organization}
          organizations={props.frame.organizations}
          onSwitch={(organization) => {
            onNavigate?.()
            props.onSwitchOrganization(organization)
          }}
        />
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <Navigation organization={props.organization} onNavigate={onNavigate} />
      </div>
      <div className="border-sidebar-border border-t p-2">
        <UserMenu
          user={props.frame.user}
          saveLocale={props.saveLocale}
          onSignOut={props.onSignOut}
        />
      </div>
    </>
  )
}

// The frame around every signed-in page: a navy sidebar on wide screens, and a header with
// a menu sheet on narrow ones (prototypes/lib/frame.ts). The page brings its own <main>.
export function AppFrame({ children, ...props }: FrameProps & { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <div className="flex min-h-svh">
      <aside className="border-sidebar-border bg-sidebar text-sidebar-foreground sticky top-0 hidden h-svh w-64 shrink-0 flex-col border-r md:flex">
        <Sidebar {...props} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-sidebar text-sidebar-foreground sticky top-0 z-10 flex h-14 items-center gap-3 px-4 md:hidden">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground -ml-2"
                aria-label={m.nav_open_menu()}
              >
                <MenuIcon />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              showCloseButton={false}
              aria-describedby={undefined}
              className="border-sidebar-border bg-sidebar text-sidebar-foreground w-64 gap-0 p-0"
            >
              <SheetTitle className="sr-only">{m.nav_menu()}</SheetTitle>
              <div className="flex justify-end px-2 pt-2">
                <SheetClose asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    aria-label={m.nav_close_menu()}
                  >
                    <XIcon />
                  </Button>
                </SheetClose>
              </div>
              <Sidebar {...props} onNavigate={() => setMenuOpen(false)} />
            </SheetContent>
          </Sheet>
          <Wordmark className="text-xl" />
          <span className="ml-auto truncate text-sm">{props.organization.name}</span>
        </header>
        {children}
      </div>
    </div>
  )
}

// While the frame's data loads on a client-side navigation into another organization.
export function AppFramePending() {
  return <div className="bg-background min-h-svh" aria-busy="true" />
}
