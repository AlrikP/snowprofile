import { cn } from 'cn'
import { m } from '#/paraglide/messages.js'

// The product name in Snowhound's style, as on snowhound.eu's header.
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className="flex items-center gap-2">
      <img src="/snowhound-mark.png" alt="" className="size-8" />
      <span
        className={cn(
          'font-heading text-2xl leading-none font-bold tracking-tight text-white',
          className,
        )}
      >
        {m.app_name()}
      </span>
    </span>
  )
}
