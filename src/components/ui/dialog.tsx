import { cn } from 'cn'
import { XIcon } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import * as React from 'react'
import { m } from '#/paraglide/messages.js'
import { Button } from './button'

function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        'fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
        className,
      )}
      {...props}
    />
  )
}

const MarkUnchangedContext = React.createContext<() => void>(() => {})

// For a dialog that saves and stays open, such as the invite dialog showing its link: what
// was typed before the save is no longer at risk.
function useMarkDialogUnchanged() {
  return React.useContext(MarkUnchangedContext)
}

// Once anything in the dialog has changed (typing, choosing, ticking, or a button such as a
// picker's add or remove), Esc and a click outside ask before discarding it. A button that
// changes no value, such as Delete opening its confirmation or Copy, carries
// data-no-change. The dialog's own Cancel and close buttons stay immediate: they are
// deliberate.
function DialogContent({
  className,
  children,
  showCloseButton = true,
  onEscapeKeyDown,
  onInteractOutside,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  const [changed, setChanged] = React.useState(false)
  const [confirming, setConfirming] = React.useState(false)
  const discardRef = React.useRef<HTMLButtonElement>(null)

  function markChanged(event: React.SyntheticEvent) {
    const target = event.target as Element
    if (
      event.type === 'input' ||
      target.closest('[role="option"], button[type="button"]:not([data-no-change])')
    ) {
      setChanged(true)
    }
  }
  const markUnchanged = React.useCallback(() => setChanged(false), [])

  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        onInputCapture={markChanged}
        onClickCapture={markChanged}
        onEscapeKeyDown={(event) => {
          onEscapeKeyDown?.(event)
          if (event.defaultPrevented) return
          // Radix hears Esc before the field does. A picker with its list open closes the
          // list, and the dialog stays as it is.
          const focused = document.activeElement
          if (
            focused?.getAttribute('role') === 'combobox' &&
            focused.getAttribute('aria-expanded') === 'true'
          ) {
            event.preventDefault()
            return
          }
          if (changed) {
            event.preventDefault()
            setConfirming(true)
          }
        }}
        onInteractOutside={(event) => {
          onInteractOutside?.(event)
          if (event.defaultPrevented || !changed) return
          event.preventDefault()
          setConfirming(true)
        }}
        className={cn(
          'fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg duration-200 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:max-w-lg',
          className,
        )}
        {...props}
      >
        <MarkUnchangedContext value={markUnchanged}>{children}</MarkUnchangedContext>
        {/* Closes this dialog when the person confirms discarding. */}
        <DialogPrimitive.Close ref={discardRef} hidden />
        <DialogPrimitive.Root open={confirming} onOpenChange={setConfirming}>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/30" />
            <DialogPrimitive.Content
              role="alertdialog"
              className="bg-background fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg outline-none sm:max-w-sm"
            >
              <DialogPrimitive.Title className="text-lg leading-none font-semibold">
                {m.dialog_discard_title()}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-muted-foreground text-sm">
                {m.dialog_discard_body()}
              </DialogPrimitive.Description>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <DialogPrimitive.Close asChild>
                  <Button type="button" variant="outline">
                    {m.dialog_keep_editing()}
                  </Button>
                </DialogPrimitive.Close>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    setConfirming(false)
                    discardRef.current?.click()
                  }}
                >
                  {m.dialog_discard()}
                </Button>
              </div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <XIcon />
            <span className="sr-only">{m.action_close()}</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('flex flex-col gap-2 text-center sm:text-left', className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">{m.action_close()}</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('text-lg leading-none font-semibold', className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
  useMarkDialogUnchanged,
}
