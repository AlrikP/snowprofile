import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { GraduationCapIcon, LockIcon, PencilIcon, PlusIcon } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { BilingualText } from '#/components/bilingual-text'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader } from '#/components/ui/card'
import { formatApproximateNumber } from '#/lib/approximate-number'
import { formatDate } from '#/lib/date-time'
import { formatPeriod } from '#/lib/period'
import { m } from '#/paraglide/messages.js'
import type { Education, Participation } from '#/server/profiles/profiles.functions'
import { EducationDialog, educationName } from './education-dialog'
import { ParticipationDialog } from './participation-dialog'
import { PersonalDialog } from './personal-dialog'
import { myParticipationsQuery, myProfileQuery } from './profile-query'

function Section({
  id,
  title,
  hint,
  action,
  children,
}: {
  id: string
  title: string
  hint?: string
  action: ReactNode
  children: ReactNode
}) {
  return (
    <Card role="region" aria-labelledby={id}>
      <CardHeader>
        <h2 id={id} className="text-xl">
          {title}
        </h2>
        {hint && <CardDescription>{hint}</CardDescription>}
        <CardAction>{action}</CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
    </Card>
  )
}

function NotSet() {
  return <span className="text-muted-foreground font-normal">{m.value_not_set()}</span>
}

function EducationEntry({ entry, onEdit }: { entry: Education; onEdit: () => void }) {
  const details = [entry.field, entry.degree].filter((each) => each.et || each.en)
  return (
    <li className="flex items-start gap-3 py-3">
      <GraduationCapIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-medium">
          <BilingualText value={entry.institution} />
        </span>
        {details.length > 0 && (
          <span className="text-muted-foreground text-sm">
            {details.map((each, index) => (
              <span key={index}>
                {index > 0 && ', '}
                <BilingualText value={each} />
              </span>
            ))}
          </span>
        )}
        {entry.startDate && (
          <span className="text-muted-foreground text-sm">
            {formatPeriod(entry.startDate, entry.endDate)}
          </span>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={m.education_edit_for({ name: educationName(entry) })}
        onClick={onEdit}
      >
        <PencilIcon />
      </Button>
    </li>
  )
}

function ParticipationEntry({
  organization,
  participation,
  onEdit,
}: {
  organization: string
  participation: Participation
  onEdit: () => void
}) {
  return (
    <li className="flex flex-col gap-2 py-4">
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Link
            to="/$organization/projects/$projectId"
            params={{ organization, projectId: participation.projectId }}
            className="font-medium underline-offset-4 hover:underline"
          >
            {participation.projectName}
          </Link>
          {participation.customerName && (
            <span className="text-muted-foreground text-sm">{participation.customerName}</span>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={m.participation_edit_for({ name: participation.projectName })}
          onClick={onEdit}
        >
          <PencilIcon />
        </Button>
      </div>
      <p className="text-sm">
        {participation.roles.map((role, index) => (
          <span key={role.id} className="font-medium">
            {index > 0 && ', '}
            <BilingualText value={role.name} />
          </span>
        ))}
        {' · '}
        {formatPeriod(participation.startDate, participation.endDate)}
        {participation.hours && ` · ${formatApproximateNumber(participation.hours, 'hours')}`}
      </p>
      {(participation.tasks.et || participation.tasks.en) && (
        <p className="text-muted-foreground text-sm whitespace-pre-line">
          <BilingualText value={participation.tasks} />
        </p>
      )}
      {participation.technologies.length > 0 && (
        <ul className="flex flex-wrap gap-1" aria-label={m.participation_technologies()}>
          {participation.technologies.map((technology) => (
            <li key={technology.id}>
              <Badge variant="secondary">{technology.name}</Badge>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

// The signed-in member's own profile (prototypes/profile.html). Own projects get their
// section in task 033.
export function ProfilePage({
  organizationId,
  organization,
  initialParticipation,
  onParticipationClosed,
}: {
  organizationId: string
  // The organization's slug, for links.
  organization: string
  // A participation to open for editing, as a project page's link asks.
  initialParticipation?: string
  onParticipationClosed: () => void
}) {
  const { data: profile } = useSuspenseQuery(myProfileQuery(organizationId))
  const { data: participations } = useSuspenseQuery(myParticipationsQuery(organizationId))
  const [personalOpen, setPersonalOpen] = useState(false)
  // The participation being edited, null to add one, or undefined while the dialog is closed.
  const [participation, setParticipation] = useState<Participation | null | undefined>(() =>
    participations.find((each) => each.id === initialParticipation),
  )
  // The entry being edited, null to add one, or undefined while the dialog is closed.
  const [editing, setEditing] = useState<Education | null | undefined>(undefined)

  return (
    <main className="flex flex-col gap-6 p-4 md:p-8">
      <h1 className="text-3xl">{m.nav_my_profile()}</h1>
      <div className="grid max-w-6xl items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-6">
          <Section
            id="section-personal"
            title={m.profile_section_personal()}
            action={
              <Button variant="outline" size="sm" onClick={() => setPersonalOpen(true)}>
                <PencilIcon />
                {m.action_edit()}
              </Button>
            }
          >
            <dl className="flex flex-col gap-3">
              <div className="flex flex-col gap-0.5">
                <dt className="text-muted-foreground text-sm">{m.profile_full_name()}</dt>
                <dd className="font-medium">{profile.fullName || <NotSet />}</dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-muted-foreground text-sm">{m.profile_join_date()}</dt>
                <dd className="font-medium">
                  {profile.joinDate ? formatDate(profile.joinDate) : <NotSet />}
                </dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-muted-foreground text-sm">{m.profile_birth_date()}</dt>
                <dd className="font-medium">
                  {profile.birthDate ? formatDate(profile.birthDate) : <NotSet />}
                </dd>
              </div>
            </dl>
            <p className="text-muted-foreground flex gap-2 text-sm">
              <LockIcon className="mt-0.5 size-4 shrink-0" />
              {m.profile_birth_date_hint()}
            </p>
          </Section>
          <Section
            id="section-education"
            title={m.profile_section_education()}
            action={
              <Button variant="outline" size="sm" onClick={() => setEditing(null)}>
                <PlusIcon />
                {m.action_add()}
              </Button>
            }
          >
            {profile.education.length === 0 ? (
              <p className="text-muted-foreground text-sm">{m.education_empty()}</p>
            ) : (
              <ul className="-mt-2 flex flex-col divide-y">
                {profile.education.map((entry) => (
                  <EducationEntry key={entry.id} entry={entry} onEdit={() => setEditing(entry)} />
                ))}
              </ul>
            )}
          </Section>
        </div>
        <div className="flex flex-col gap-6">
          <Section
            id="section-participations"
            title={m.profile_section_participations()}
            hint={m.profile_section_participations_hint()}
            action={
              <Button variant="outline" size="sm" onClick={() => setParticipation(null)}>
                <PlusIcon />
                {m.participation_add()}
              </Button>
            }
          >
            {participations.length === 0 ? (
              <p className="text-muted-foreground text-sm">{m.participation_empty()}</p>
            ) : (
              <ul className="-mt-2 flex flex-col divide-y">
                {participations.map((each) => (
                  <ParticipationEntry
                    key={each.id}
                    organization={organization}
                    participation={each}
                    onEdit={() => setParticipation(each)}
                  />
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
      <ParticipationDialog
        open={participation !== undefined}
        onClose={() => {
          setParticipation(undefined)
          onParticipationClosed()
        }}
        organizationId={organizationId}
        participation={participation ?? null}
      />
      <PersonalDialog
        open={personalOpen}
        onClose={() => setPersonalOpen(false)}
        organizationId={organizationId}
        profile={profile}
      />
      <EducationDialog
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        organizationId={organizationId}
        entry={editing ?? null}
      />
    </main>
  )
}

export function ProfilePending() {
  return (
    <main className="flex flex-col gap-6 p-4 md:p-8" aria-busy="true">
      <h1 className="text-3xl">{m.nav_my_profile()}</h1>
      <div className="grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="bg-muted h-64 animate-pulse rounded-xl" />
        <div className="bg-muted h-96 animate-pulse rounded-xl" />
      </div>
    </main>
  )
}
