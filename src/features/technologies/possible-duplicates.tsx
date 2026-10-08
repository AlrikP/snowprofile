import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowRightIcon, GitMergeIcon, InfoIcon, XIcon } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { errorMessage } from '#/lib/errors'
import { type Technology, technologyCatalogueQuery } from '#/lib/technology-catalogue'
import { m } from '#/paraglide/messages.js'
import { markNotDuplicate } from '#/server/technologies/technologies.functions'

type Pair = { from: Technology; into: Technology }

function Uses({ technology }: { technology: Technology }) {
  return (
    <span className="text-muted-foreground text-sm">
      {m.technologies_use_counts({ projects: technology.projects, people: technology.people })}
    </span>
  )
}

// Near-duplicate pairs for admins to merge or mark "Not a duplicate"
// (src/lib/technology-duplicates.ts, prototypes/technologies.html).
export function PossibleDuplicates({
  organizationId,
  pairs,
  onMerge,
}: {
  organizationId: string
  pairs: Pair[]
  onMerge: (pair: Pair) => void
}) {
  const queryClient = useQueryClient()
  const dismiss = useMutation({
    mutationFn: ({ from, into }: Pair) =>
      markNotDuplicate({
        data: { organizationId, technologyId: from.id, otherTechnologyId: into.id },
      }),
    onSuccess: () => queryClient.invalidateQueries(technologyCatalogueQuery(organizationId)),
  })
  if (pairs.length === 0) return null
  return (
    <Alert className="max-w-3xl" role="region" aria-labelledby="duplicates-title">
      <InfoIcon />
      <AlertTitle id="duplicates-title">{m.technologies_duplicates_title()}</AlertTitle>
      <AlertDescription className="w-full">
        <p>{m.technologies_duplicates_body()}</p>
        <ul className="text-foreground flex w-full flex-col divide-y">
          {pairs.map((pair) => (
            <li
              key={`${pair.from.id}|${pair.into.id}`}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2"
            >
              <span className="font-medium">{pair.from.name}</span>
              <Uses technology={pair.from} />
              <ArrowRightIcon className="text-muted-foreground size-4" aria-hidden />
              <span className="font-medium">{pair.into.name}</span>
              <Uses technology={pair.into} />
              <span className="ml-auto flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={dismiss.isPending}
                  aria-label={m.technologies_not_duplicate_pair({
                    from: pair.from.name,
                    into: pair.into.name,
                  })}
                  onClick={() => dismiss.mutate(pair)}
                >
                  <XIcon />
                  {m.technologies_not_duplicate()}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label={m.technologies_merge_pair({
                    from: pair.from.name,
                    into: pair.into.name,
                  })}
                  onClick={() => onMerge(pair)}
                >
                  <GitMergeIcon />
                  {m.merge_submit()}
                </Button>
              </span>
            </li>
          ))}
        </ul>
        {dismiss.error && <p role="alert">{errorMessage(dismiss.error)}</p>}
      </AlertDescription>
    </Alert>
  )
}
