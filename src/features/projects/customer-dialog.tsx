import { type FormEvent, useState } from 'react'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { m } from '#/paraglide/messages.js'

function CustomerForm({ onAdd }: { onAdd: (name: string) => void }) {
  const [name, setName] = useState('')

  function submit(event: FormEvent) {
    // The dialog sits inside the project form; its submit must not save the project.
    event.preventDefault()
    event.stopPropagation()
    if (name.trim()) onAdd(name.trim())
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{m.project_customer_new()}</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        <Label htmlFor="customer-name">{m.project_customer_name()}</Label>
        <Input
          id="customer-name"
          autoComplete="off"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            {m.action_cancel()}
          </Button>
        </DialogClose>
        <Button type="submit" disabled={!name.trim()}>
          {m.action_save()}
        </Button>
      </DialogFooter>
    </form>
  )
}

// Names a new customer for the project form. Nothing is stored until the project is saved.
export function CustomerDialog({
  open,
  onClose,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  onAdd: (name: string) => void
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>{open && <CustomerForm onAdd={onAdd} />}</DialogContent>
    </Dialog>
  )
}
