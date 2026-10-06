import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { EllipsisIcon, SendIcon, UserMinusIcon, XIcon } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { formatDate } from '#/lib/date-time'
import { errorMessage } from '#/lib/errors'
import { m } from '#/paraglide/messages.js'
import { cancelUpdateRequest, type Person } from '#/server/profiles/profiles.functions'
import { LeaveDialog } from './leave-dialog'
import { peopleQuery } from './people-query'
import { RequestDialog } from './request-dialog'

// A confirmation older than this asks for a look.
const STALE_MONTHS = 6

function isStale(confirmedAt: Date, now: Date) {
  const limit = new Date(now)
  limit.setMonth(limit.getMonth() - STALE_MONTHS)
  return confirmedAt < limit
}

function day(date: Date) {
  return formatDate(date.toISOString().slice(0, 10))
}

const STALE_BADGE = 'border-amber-500 text-amber-800'

function Confirmed({ person, now }: { person: Person; now: Date }) {
  if (!person.confirmedAt) {
    return (
      <Badge variant="outline" className={STALE_BADGE}>
        {m.people_never_confirmed()}
      </Badge>
    )
  }
  return (
    <span className="flex flex-wrap items-center gap-2">
      {day(person.confirmedAt)}
      {isStale(person.confirmedAt, now) && (
        <Badge variant="outline" className={STALE_BADGE}>
          {m.people_stale()}
        </Badge>
      )}
    </span>
  )
}

function Request({ person }: { person: Person }) {
  if (!person.requestedAt) return <span className="text-muted-foreground">—</span>
  return (
    <span className="flex items-center gap-1">
      <SendIcon className="text-muted-foreground size-3.5" />
      {m.people_request_sent()} {day(person.requestedAt)}
    </span>
  )
}

function Actions({
  person,
  onRequest,
  onCancel,
  onLeave,
}: {
  person: Person
  onRequest: () => void
  onCancel: () => void
  onLeave: () => void
}) {
  if (person.leftDate) return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={m.action_actions_for({ name: person.fullName })}
        >
          <EllipsisIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {person.requestedAt ? (
          <DropdownMenuItem onSelect={onCancel}>
            <XIcon />
            {m.people_cancel_request()}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={onRequest}>
            <SendIcon />
            {m.people_request()}
          </DropdownMenuItem>
        )}
        {person.canMarkLeft && (
          <DropdownMenuItem variant="destructive" onSelect={onLeave}>
            <UserMinusIcon />
            {m.people_mark_left()}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Every profile with its last confirmation and open request, for admins
// (prototypes/people.html).
export function PeoplePage({
  organizationId,
  initialNow,
}: {
  organizationId: string
  // The time staleness is judged against; tests pass a fixed one.
  initialNow?: Date
}) {
  const [now] = useState(() => initialNow ?? new Date())
  const queryClient = useQueryClient()
  const { data: people } = useSuspenseQuery(peopleQuery(organizationId))
  const [showLeavers, setShowLeavers] = useState(false)
  const [requesting, setRequesting] = useState<Person | 'all' | null>(null)
  const [leaving, setLeaving] = useState<Person | null>(null)
  const cancel = useMutation({
    mutationFn: (profileId: string) => cancelUpdateRequest({ data: { organizationId, profileId } }),
    onSettled: () => queryClient.invalidateQueries(peopleQuery(organizationId)),
  })
  const shown = people.filter((person) => showLeavers || !person.leftDate)
  const waiting = people.filter((person) => !person.leftDate && !person.requestedAt).length

  return (
    <main className="flex flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl">{m.people_title()}</h1>
        <Button onClick={() => setRequesting('all')}>
          <SendIcon />
          {m.people_request_all()}
        </Button>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="accent-foreground size-4"
          checked={showLeavers}
          onChange={(event) => setShowLeavers(event.target.checked)}
        />
        {m.people_show_leavers()}
      </label>
      {cancel.error && (
        <p role="alert" className="text-destructive text-sm">
          {errorMessage(cancel.error)}
        </p>
      )}
      <Card className="gap-0 overflow-hidden py-0">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr className="border-b">
              <th className="px-4 py-3 font-medium">{m.people_col_person()}</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">
                {m.people_col_confirmed()}
              </th>
              <th className="hidden px-4 py-3 font-medium lg:table-cell">
                {m.people_col_request()}
              </th>
              <th className="hidden px-4 py-3 text-right font-medium sm:table-cell">
                {m.people_col_participations()}
              </th>
              <th className="w-12 px-4 py-3">
                <span className="sr-only">{m.action_actions()}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map((person) => (
              <tr key={person.id} className="border-b last:border-0">
                <td className="px-4 py-3 align-top">
                  <div className="flex flex-wrap items-center gap-2 font-medium">
                    {person.fullName}
                    {person.leftDate && (
                      <Badge variant="outline">
                        {m.people_left({ date: formatDate(person.leftDate) })}
                      </Badge>
                    )}
                  </div>
                  <div className="text-muted-foreground md:hidden">
                    <Confirmed person={person} now={now} />
                  </div>
                  <div className="text-muted-foreground lg:hidden">
                    {person.requestedAt && <Request person={person} />}
                  </div>
                </td>
                <td className="hidden px-4 py-3 align-top md:table-cell">
                  <Confirmed person={person} now={now} />
                </td>
                <td className="hidden px-4 py-3 align-top lg:table-cell">
                  <Request person={person} />
                </td>
                <td className="hidden px-4 py-3 text-right align-top tabular-nums sm:table-cell">
                  {person.participations}
                </td>
                <td className="px-4 py-3 text-right align-top">
                  <Actions
                    person={person}
                    onRequest={() => setRequesting(person)}
                    onCancel={() => cancel.mutate(person.id)}
                    onLeave={() => setLeaving(person)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <RequestDialog
        organizationId={organizationId}
        target={requesting}
        waiting={waiting}
        onClose={() => setRequesting(null)}
      />
      <LeaveDialog
        organizationId={organizationId}
        person={leaving}
        onClose={() => setLeaving(null)}
      />
    </main>
  )
}

export function PeoplePending() {
  return (
    <main className="flex flex-col gap-6 p-4 md:p-8" aria-busy="true">
      <h1 className="text-3xl">{m.people_title()}</h1>
      <div className="bg-muted h-96 animate-pulse rounded-xl" />
    </main>
  )
}
