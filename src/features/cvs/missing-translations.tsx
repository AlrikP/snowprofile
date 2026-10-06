import { Link } from '@tanstack/react-router'
import { LanguagesIcon } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { m } from '#/paraglide/messages.js'
import type { Cv } from '#/server/cvs/cvs.functions'

type Missing = Cv['missing'][number]

const FIELDS: Record<Missing['field'], () => string> = {
  project_description: m.cv_missing_project_description,
  own_project_description: m.cv_missing_own_project_description,
  tasks: m.cv_missing_tasks,
  role: m.cv_missing_role,
  education: m.cv_missing_education,
}

const LINK = 'ml-auto underline underline-offset-4'

function Fix({ organization, fix }: { organization: string; fix: Missing['fix'] }) {
  switch (fix.page) {
    case 'project':
      return (
        <Link
          to="/$organization/projects/$projectId/edit"
          params={{ organization, projectId: fix.projectId }}
          className={LINK}
        >
          {m.cv_fix_project()}
        </Link>
      )
    case 'roles':
      return (
        <Link to="/$organization/roles" params={{ organization }} className={LINK}>
          {m.cv_fix_roles()}
        </Link>
      )
    case 'people':
      return (
        <Link to="/$organization/people" params={{ organization }} className={LINK}>
          {m.cv_fix_people()}
        </Link>
      )
  }
}

// The texts the CV shows in the other language, each with where it is fixed, so they can
// be translated before the CV goes out.
export function MissingTranslations({
  organization,
  missing,
}: {
  organization: string
  missing: Missing[]
}) {
  return (
    <Alert role="region" aria-labelledby="cv-missing-title" className="border-amber-500">
      <LanguagesIcon className="text-amber-800" />
      <AlertTitle id="cv-missing-title">{m.cv_missing_title({ count: missing.length })}</AlertTitle>
      <AlertDescription className="w-full">
        <p>{m.cv_missing_body()}</p>
        <ul className="text-foreground flex w-full flex-col">
          {missing.map((each, index) => (
            <li key={index} className="flex flex-wrap items-center gap-x-2 py-1">
              <span>
                <span className="font-medium">{each.name}</span> · {FIELDS[each.field]()}
                {each.person && <span className="text-muted-foreground"> · {each.person}</span>}
              </span>
              <Fix organization={organization} fix={each.fix} />
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  )
}
