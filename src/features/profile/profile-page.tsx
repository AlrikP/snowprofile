import { useSuspenseQuery } from '@tanstack/react-query'
import { GraduationCapIcon, LockIcon, PencilIcon, PlusIcon } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { BilingualText } from '#/components/bilingual-text'
import { Button } from '#/components/ui/button'
import { Card, CardAction, CardContent, CardHeader } from '#/components/ui/card'
import { formatDate } from '#/lib/date-time'
import { formatPeriod } from '#/lib/period'
import { m } from '#/paraglide/messages.js'
import type { Education } from '#/server/profiles/profiles.functions'
import { EducationDialog, educationName } from './education-dialog'
import { PersonalDialog } from './personal-dialog'
import { myProfileQuery } from './profile-query'

function Section({
  id,
  title,
  action,
  children,
}: {
  id: string
  title: string
  action: ReactNode
  children: ReactNode
}) {
  return (
    <Card role="region" aria-labelledby={id}>
      <CardHeader>
        <h2 id={id} className="text-xl">
          {title}
        </h2>
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

// The signed-in member's own profile (prototypes/profile.html). Participations and own
// projects get their sections in tasks 031 and 033.
export function ProfilePage({ organizationId }: { organizationId: string }) {
  const { data: profile } = useSuspenseQuery(myProfileQuery(organizationId))
  const [personalOpen, setPersonalOpen] = useState(false)
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
      </div>
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
      </div>
    </main>
  )
}
