import { useMutation, useQueryClient } from '@tanstack/react-query'
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
import { type Criterion, criteriaQuery, criterionLabel } from '#/lib/criteria'
import { errorMessage } from '#/lib/errors'
import { m } from '#/paraglide/messages.js'
import { removeCriterion } from '#/server/criteria/criteria.functions'

// Confirms a removal, saying how many projects' answers it hides.
export function RemoveCriterionDialog({
  organizationId,
  criterion,
  onClose,
}: {
  organizationId: string
  criterion: Criterion | null
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const remove = useMutation({
    mutationFn: (criterionId: string) => removeCriterion({ data: { organizationId, criterionId } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries(criteriaQuery(organizationId))
      onClose()
    },
  })

  return (
    <Dialog
      open={criterion !== null}
      onOpenChange={(open) => {
        if (open) return
        remove.reset()
        onClose()
      }}
    >
      <DialogContent>
        {criterion && (
          <>
            <DialogHeader>
              <DialogTitle>
                {m.criteria_remove_title({ name: criterionLabel(criterion) })}
              </DialogTitle>
              <DialogDescription>
                {criterion.answers === 0
                  ? m.criteria_remove_unanswered()
                  : m.criteria_remove_body({ count: criterion.answers })}
              </DialogDescription>
            </DialogHeader>
            {remove.error && <p role="alert">{errorMessage(remove.error)}</p>}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  {m.action_cancel()}
                </Button>
              </DialogClose>
              <Button
                variant="destructive"
                disabled={remove.isPending}
                onClick={() => remove.mutate(criterion.id)}
              >
                <Trash2Icon />
                {m.criteria_remove()}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
