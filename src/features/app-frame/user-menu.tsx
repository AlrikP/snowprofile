import { ChevronsUpDownIcon, LogOutIcon } from 'lucide-react'
import { LANGUAGES, useLocaleChoice } from '#/components/language-switch'
import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { m } from '#/paraglide/messages.js'
import type { Locale } from '#/paraglide/runtime.js'
import { initials } from './organization-switcher'
import { sidebarButton } from './sidebar-button'

// The signed-in user, with the UI language and signing out.
export function UserMenu({
  user,
  saveLocale,
  onSignOut,
}: {
  user: { name: string; email: string }
  saveLocale: (locale: Locale) => Promise<unknown>
  onSignOut: () => void
}) {
  const { current, choose, error } = useLocaleChoice(saveLocale)
  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger className={sidebarButton('lg')}>
          <Avatar className="rounded-lg" aria-hidden="true">
            <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground rounded-lg">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
          <span className="sr-only">{m.user_menu_label()}</span>
          <span className="grid flex-1 text-left leading-tight">
            <span className="truncate font-medium">{user.name}</span>
            <span className="text-sidebar-foreground/70 truncate text-xs">{user.email}</span>
          </span>
          <ChevronsUpDownIcon className="ml-auto" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-60" side="top" align="start">
          <DropdownMenuLabel className="text-muted-foreground text-xs">
            {m.language_label()}
          </DropdownMenuLabel>
          <DropdownMenuRadioGroup value={current}>
            {LANGUAGES.map(({ locale, name }) => (
              <DropdownMenuRadioItem
                key={locale}
                value={locale}
                lang={locale}
                onSelect={() => void choose(locale)}
              >
                {name}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onSignOut}>
            <LogOutIcon />
            {m.sign_out()}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {error && (
        <p role="alert" className="text-sidebar-accent-foreground px-2 pt-1 text-sm">
          {error}
        </p>
      )}
    </>
  )
}
