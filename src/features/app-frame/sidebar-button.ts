import { cn } from 'cn'

// shadcn's sidebar menu button, without its provider: the frame needs only the look.
export function sidebarButton(size: 'default' | 'lg' = 'default', className?: string) {
  return cn(
    'flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 aria-[current=page]:bg-sidebar-accent aria-[current=page]:font-medium aria-[current=page]:text-sidebar-primary data-[state=open]:bg-sidebar-accent [&>svg]:size-4 [&>svg]:shrink-0',
    size === 'lg' ? 'h-12' : 'h-8',
    className,
  )
}
