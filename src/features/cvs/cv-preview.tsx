import { formatApproximateNumber } from '#/lib/approximate-number'
import { formatDate } from '#/lib/date-time'
import { formatPeriod } from '#/lib/period'
import { m } from '#/paraglide/messages.js'
import type { Cv, CvPerson, CvProject } from '#/server/cvs/cvs.functions'

type Language = Cv['language']
type Text = NonNullable<CvProject['description']>

// Text in the CV's language, or the other one highlighted, so a gap shows where it's read.
function CvText({ value }: { value: Text | null }) {
  if (!value) return null
  if (!value.fallback) return <span lang={value.lang}>{value.text}</span>
  return (
    <span
      lang={value.lang}
      title={value.lang === 'et' ? m.translation_missing_en() : m.translation_missing_et()}
      className="bg-amber-100 text-amber-900"
    >
      {value.text}
    </span>
  )
}

function Person({ person, language }: { person: CvPerson; language: Language }) {
  const locale = { locale: language }
  return (
    <section className="flex flex-col gap-1" aria-labelledby={`cv-person-${person.id}`}>
      <h3 id={`cv-person-${person.id}`} className="font-sans text-lg font-semibold">
        {person.fullName}
      </h3>
      {person.birthDate && (
        <p className="text-sm">
          {m.cv_born({ date: formatDate(person.birthDate, language) }, locale)}
        </p>
      )}
      {person.education.length > 0 && (
        <ul className="text-sm" aria-label={m.cv_education({}, locale)}>
          {person.education.map((each, index) => (
            <li key={index}>
              <CvText value={each.institution} />
              {each.field && (
                <>
                  , <CvText value={each.field} />
                </>
              )}
              {each.degree && (
                <>
                  , <CvText value={each.degree} />
                </>
              )}
              {each.startDate && ` (${formatPeriod(each.startDate, each.endDate, language)})`}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Project({
  project,
  names,
  language,
}: {
  project: CvProject
  names: Map<string, string> | null
  language: Language
}) {
  const client = [project.employer, project.customerName].filter(Boolean).join(' · ')
  return (
    <li className="flex flex-col gap-1 py-3 text-sm">
      <span className="text-base font-semibold">{project.name}</span>
      {client && <span className="text-muted-foreground">{client}</span>}
      <CvText value={project.description} />
      <ul className="flex flex-col gap-1">
        {project.parts.map((part) => (
          <li key={part.profileId} className="flex flex-col">
            <span>
              {names && <span className="font-medium">{names.get(part.profileId)}: </span>}
              {part.roles.map((role, index) => (
                <span key={index}>
                  {index > 0 && ', '}
                  <strong>
                    <CvText value={role} />
                  </strong>
                </span>
              ))}
              {part.roles.length > 0 && ' · '}
              {formatPeriod(part.startDate, part.endDate, language)}
              {part.hours && ` · ${formatApproximateNumber(part.hours, 'hours', language)}`}
            </span>
            <CvText value={part.tasks} />
            {part.technologies.length > 0 && (
              <span className="text-muted-foreground">{part.technologies.join(', ')}</span>
            )}
          </li>
        ))}
      </ul>
    </li>
  )
}

// What the CV says, in its language: the people with their education, then the projects.
export function CvPreview({ cv }: { cv: Cv }) {
  const names = cv.people.length > 1 ? new Map(cv.people.map((p) => [p.id, p.fullName])) : null
  return (
    <div className="flex flex-col gap-4" lang={cv.language}>
      {cv.people.map((person) => (
        <Person key={person.id} person={person} language={cv.language} />
      ))}
      {cv.projects.length === 0 ? (
        <p className="text-muted-foreground text-sm">{m.cv_no_projects()}</p>
      ) : (
        <ul className="flex flex-col divide-y" aria-label={m.cv_projects()}>
          {cv.projects.map((project) => (
            <Project key={project.key} project={project} names={names} language={cv.language} />
          ))}
        </ul>
      )}
    </div>
  )
}
