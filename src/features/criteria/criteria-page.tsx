import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import {
  ChevronDownIcon,
  ChevronUpIcon,
  EllipsisIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react'
import { useState } from 'react'
import { BilingualText } from '#/components/bilingual-text'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { type Criterion, criteriaQuery, criterionLabel, criterionName } from '#/lib/criteria'
import { errorMessage } from '#/lib/errors'
import { m } from '#/paraglide/messages.js'
import { moveCriterion } from '#/server/criteria/criteria.functions'
import { CriterionDialog } from './criterion-dialog'
import { RemoveCriterionDialog } from './remove-criterion-dialog'

function CriterionActions({
  criterion,
  onEdit,
  onRemove,
}: {
  criterion: Criterion
  onEdit: () => void
  onRemove: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={m.action_actions_for({ name: criterionLabel(criterion) })}
        >
          <EllipsisIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onSelect={onEdit}>
          <PencilIcon />
          {m.criteria_edit()}
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={onRemove}>
          <Trash2Icon />
          {m.criteria_remove()}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// The admin's checklist of technical characteristics (prototypes/criteria.html).
export function CriteriaPage({ organizationId }: { organizationId: string }) {
  const queryClient = useQueryClient()
  const { data: criteria } = useSuspenseQuery(criteriaQuery(organizationId))
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Criterion | null>(null)
  const [removing, setRemoving] = useState<Criterion | null>(null)
  const move = useMutation({
    mutationFn: (input: { criterionId: string; direction: 'up' | 'down' }) =>
      moveCriterion({ data: { organizationId, ...input } }),
    onSettled: () => queryClient.invalidateQueries(criteriaQuery(organizationId)),
  })

  return (
    <main className="flex flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl">{m.criteria_title()}</h1>
          <p className="text-muted-foreground max-w-2xl text-sm">{m.criteria_description()}</p>
        </div>
        <Button onClick={() => setAdding(true)}>
          <PlusIcon />
          {m.criteria_add()}
        </Button>
      </div>

      {move.error && <p role="alert">{errorMessage(move.error)}</p>}

      {criteria.length === 0 ? (
        <p className="text-muted-foreground max-w-4xl rounded-xl border border-dashed p-8 text-center text-sm">
          {m.criteria_empty()}
        </p>
      ) : (
        <Card className="max-w-4xl gap-0 py-2">
          <ol className="flex flex-col divide-y">
            {criteria.map((criterion, index) => {
              const label = criterionLabel(criterion)
              return (
                <li key={criterion.id} className="flex items-center gap-3 px-4 py-2">
                  <span className="text-muted-foreground w-5 text-right text-sm tabular-nums">
                    {index + 1}.
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                    <span className="font-medium">
                      <BilingualText value={criterionName(criterion)} />
                    </span>
                    <span className="text-muted-foreground text-sm sm:ml-auto">
                      {m.criteria_answers({ count: criterion.answers })}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={m.criteria_move_up({ name: label })}
                      disabled={index === 0 || move.isPending}
                      onClick={() => move.mutate({ criterionId: criterion.id, direction: 'up' })}
                    >
                      <ChevronUpIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={m.criteria_move_down({ name: label })}
                      disabled={index === criteria.length - 1 || move.isPending}
                      onClick={() => move.mutate({ criterionId: criterion.id, direction: 'down' })}
                    >
                      <ChevronDownIcon />
                    </Button>
                    <CriterionActions
                      criterion={criterion}
                      onEdit={() => setEditing(criterion)}
                      onRemove={() => setRemoving(criterion)}
                    />
                  </div>
                </li>
              )
            })}
          </ol>
        </Card>
      )}

      <CriterionDialog
        organizationId={organizationId}
        criterion={editing}
        open={adding || editing !== null}
        onClose={() => {
          setAdding(false)
          setEditing(null)
        }}
      />
      <RemoveCriterionDialog
        organizationId={organizationId}
        criterion={removing}
        onClose={() => setRemoving(null)}
      />
    </main>
  )
}

export function CriteriaPending() {
  return (
    <main className="flex flex-col gap-6 p-4 md:p-8" aria-busy="true">
      <h1 className="text-3xl">{m.criteria_title()}</h1>
      <div className="bg-muted h-96 max-w-4xl animate-pulse rounded-xl" />
    </main>
  )
}
