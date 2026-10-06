import { useMutation } from '@tanstack/react-query'
import { Trash2Icon } from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { errorMessage } from '#/lib/errors'
import { m } from '#/paraglide/messages.js'
import { deleteProject } from '#/server/projects/projects.functions'

export function DeleteProjectDialog({
  organizationId,
  project,
  open,
  onClose,
  onDeleted,
}: {
  organizationId: string
  project: { id: string; name: string }
  open: boolean
  onClose: () => void
  onDeleted: () => Promise<void>
}) {
  const remove = useMutation({
    mutationFn: () => deleteProject({ data: { organizationId, projectId: project.id } }),
    onSuccess: onDeleted,
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) return
        remove.reset()
        onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.project_delete_title({ name: project.name })}</DialogTitle>
          <DialogDescription>{m.project_delete_body()}</DialogDescription>
        </DialogHeader>
        {remove.error && <p role="alert">{errorMessage(remove.error)}</p>}
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              {m.action_cancel()}
            </Button>
          </DialogClose>
          <Button variant="destructive" disabled={remove.isPending} onClick={() => remove.mutate()}>
            <Trash2Icon />
            {m.project_delete()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
