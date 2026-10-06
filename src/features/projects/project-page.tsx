import { useSuspenseQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  ArrowLeftIcon,
  BuildingIcon,
  CalendarIcon,
  CircleCheckIcon,
  CircleMinusIcon,
  CircleXIcon,
  InfoIcon,
  PencilIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { BilingualText } from '#/components/bilingual-text'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from '#/components/ui/card'
import { formatApproximateNumber } from '#/lib/approximate-number'
import { formatDateTime } from '#/lib/date-time'
import { formatPeriod } from '#/lib/period'
import { m } from '#/paraglide/messages.js'
import type { ProjectView } from '#/server/projects/projects.functions'
import { projectQuery } from './projects-query'

type Person = ProjectView['people'][number]
type Details = NonNullable<ProjectView['details']>

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <Card role="region" aria-labelledby={id}>
      <CardHeader>
        <h2 id={id} className="text-xl">
          {title}
        </h2>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function Roles({ person }: { person: Person }) {
  return (
    <>
      {person.roles.map((role, index) => (
        <span key={`${role.et}-${role.en}`}>
          {index > 0 && ', '}
          <BilingualText value={role} />
        </span>
      ))}
    </>
  )
}

function Answer({ answer }: { answer: boolean | null }) {
  if (answer === null) {
    return (
      <span className="text-muted-foreground flex items-center gap-1.5">
        <CircleMinusIcon className="size-4" />
        {m.answer_none()}
      </span>
    )
  }
  return answer ? (
    <span className="flex items-center gap-1.5 text-emerald-700">
      <CircleCheckIcon className="size-4" />
      {m.answer_yes()}
    </span>
  ) : (
    <span className="text-muted-foreground flex items-center gap-1.5">
      <CircleXIcon className="size-4" />
      {m.answer_no()}
    </span>
  )
}

function TenderDetails({ details }: { details: Details }) {
  const rows = [
    { label: m.project_tender_reference(), value: details.tenderReference },
    {
      label: m.project_hours(),
      value: details.totalHours && formatApproximateNumber(details.totalHours, 'hours'),
    },
    {
      label: m.project_cost(),
      value: details.cost && formatApproximateNumber(details.cost, 'euros'),
    },
  ]
  return (
    <>
      <Section id="project-tender" title={m.project_section_tender()}>
        <dl className="grid gap-3 text-sm">
          {rows.map((row) => (
            <div key={row.label} className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="text-right font-medium">
                {row.value ?? (
                  <span className="text-muted-foreground font-normal">{m.value_not_set()}</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </Section>
      <Section id="project-contacts" title={m.project_section_contacts()}>
        {details.contacts.length === 0 ? (
          <p className="text-muted-foreground text-sm">{m.value_not_set()}</p>
        ) : (
          <ul className="flex flex-col gap-3 text-sm">
            {details.contacts.map((contact) => (
              <li key={contact.id} className="flex flex-col">
                <span className="flex flex-wrap items-center gap-2 font-medium">
                  {contact.name}
                  {contact.noLongerValid && (
                    <Badge variant="outline">{m.contact_no_longer_valid()}</Badge>
                  )}
                </span>
                <span className="text-muted-foreground flex flex-wrap gap-x-3">
                  {contact.email && <span>{contact.email}</span>}
                  {contact.phone && <span>{contact.phone}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  )
}

// One project, with tender details for admins and participants (prototypes/project.html).
export function ProjectPage({
  organizationId,
  organization,
  projectId,
  canEdit,
}: {
  organizationId: string
  // The organization's slug, for links.
  organization: string
  projectId: string
  canEdit: boolean
}) {
  const { data: project } = useSuspenseQuery(projectQuery(organizationId, projectId))
  const mine = project.people.filter((person) => person.mine)
  const at = formatDateTime(project.lastChange.at)

  return (
    <main className="flex flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Button asChild variant="ghost" size="sm" className="-ml-2 self-start">
            <Link to="/$organization/projects" params={{ organization }}>
              <ArrowLeftIcon />
              {m.action_back_to_projects()}
            </Link>
          </Button>
          <h1 className="text-3xl">{project.name}</h1>
          <p className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <span className="flex items-center gap-1.5">
              <BuildingIcon className="size-4" />
              {project.customerName ?? m.projects_no_customer()}
            </span>
            <span className="flex items-center gap-1.5">
              <CalendarIcon className="size-4" />
              {formatPeriod(project.startDate, project.endDate)}
            </span>
          </p>
          <p className="text-muted-foreground text-xs">
            {project.lastChange.by === null
              ? m.project_last_change_system({ at })
              : m.project_last_change({ at, name: project.lastChange.by })}
          </p>
        </div>
        {canEdit && (
          <Button asChild variant="outline">
            <Link
              to="/$organization/projects/$projectId/edit"
              params={{ organization, projectId: project.id }}
            >
              <PencilIcon />
              {m.project_edit()}
            </Link>
          </Button>
        )}
      </div>

      {project.technologies.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label={m.projects_col_technologies()}>
          {project.technologies.map((technology) => (
            <li key={technology.id}>
              <Badge variant="secondary">{technology.name}</Badge>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <Section id="project-description" title={m.project_section_description()}>
            <div className="whitespace-pre-line">
              <BilingualText value={project.description} />
            </div>
          </Section>
          <Section id="project-criteria" title={m.project_section_criteria()}>
            <ul className="flex flex-col gap-2 text-sm">
              {project.criteria.map((criterion) => (
                <li key={criterion.id} className="grid grid-cols-[6.5rem_1fr] gap-2">
                  <Answer answer={criterion.answer} />
                  <span>
                    <BilingualText value={criterion.name} />
                    {criterion.note && (
                      <span className="text-muted-foreground"> · {criterion.note}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
          <Section id="project-people" title={m.project_section_people()}>
            {project.people.length === 0 && (
              <p className="text-muted-foreground text-sm">{m.value_not_set()}</p>
            )}
            <ul className="flex flex-col gap-3 text-sm">
              {project.people.map((person) => (
                <li key={person.participationId} className="flex flex-col">
                  <span className="flex flex-wrap items-center gap-2 font-medium">
                    {person.fullName}
                    {person.leftDate && <Badge variant="outline">{m.project_person_left()}</Badge>}
                  </span>
                  <span className="text-muted-foreground">
                    <Roles person={person} /> · {formatPeriod(person.startDate, person.endDate)}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        </div>

        <div className="flex flex-col gap-6">
          {mine.map((person) => (
            <Card
              key={person.participationId}
              role="region"
              aria-labelledby={`mine-${person.participationId}`}
            >
              <CardHeader>
                <h2 id={`mine-${person.participationId}`} className="text-xl">
                  {m.project_my_participation()}
                </h2>
                <CardDescription>
                  <Roles person={person} /> · {formatPeriod(person.startDate, person.endDate)}
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button asChild variant="outline">
                  <Link
                    to="/$organization/profile"
                    params={{ organization }}
                    search={{ participation: person.participationId }}
                  >
                    <PencilIcon />
                    {m.project_edit_my_participation()}
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
          {project.details ? (
            <TenderDetails details={project.details} />
          ) : (
            <Alert>
              <InfoIcon />
              <AlertDescription>{m.project_details_hidden()}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </main>
  )
}

export function ProjectPending() {
  return (
    <main className="flex flex-col gap-6 p-4 md:p-8" aria-busy="true">
      <div className="bg-muted h-10 w-2/3 animate-pulse rounded-md" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="bg-muted h-96 animate-pulse rounded-xl" />
        <div className="bg-muted h-64 animate-pulse rounded-xl" />
      </div>
    </main>
  )
}
