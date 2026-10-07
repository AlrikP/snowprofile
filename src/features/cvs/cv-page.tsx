import { keepPreviousData, useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { CriteriaFilter } from '#/components/criteria-filter'
import { LANGUAGES } from '#/components/language-switch'
import { PeriodFilter } from '#/components/period-filter'
import { RadioToggle } from '#/components/radio-toggle'
import { RolePicker } from '#/components/role-picker'
import { TechnologyPicker } from '#/components/technology-picker'
import { Card, CardContent } from '#/components/ui/card'
import { criteriaQuery } from '#/lib/criteria'
import { errorMessage } from '#/lib/errors'
import { peopleQuery } from '#/lib/people'
import { roleCatalogueQuery } from '#/lib/role-catalogue'
import { technologyCatalogueQuery } from '#/lib/technology-catalogue'
import { m } from '#/paraglide/messages.js'
import { cvDocumentHref } from '#/server/cvs/cvs.schemas'
import { cvQuery } from './cv-query'
import { type CvSelection, cvInput, isFiltered } from './cv-selection'
import { CvView } from './cv-view'
import { MissingTranslations } from './missing-translations'
import { PersonPicker } from './person-picker'

const CHECKBOX = 'accent-foreground size-4'

function Selection({
  organizationId,
  selection,
  set,
}: {
  organizationId: string
  selection: CvSelection
  set: (next: Partial<CvSelection>) => void
}) {
  const { data: people } = useSuspenseQuery(peopleQuery(organizationId))
  const { data: catalogue } = useSuspenseQuery(technologyCatalogueQuery(organizationId))
  const { data: roles } = useSuspenseQuery(roleCatalogueQuery(organizationId))
  const { data: criteria } = useSuspenseQuery(criteriaQuery(organizationId))
  // "Filtered" stays chosen while its filters and period are still empty.
  const [filtering, setFiltering] = useState(() => isFiltered(selection))

  function chooseProjects(filtered: boolean) {
    setFiltering(filtered)
    if (!filtered) {
      set({ t: undefined, r: undefined, c: undefined, from: undefined, to: undefined })
    }
  }

  return (
    <Card className="gap-5 py-5">
      <CardContent className="grid gap-5 px-5 md:grid-cols-2 2xl:grid-cols-1">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">{m.cv_people()}</legend>
          <PersonPicker
            people={people}
            value={selection.people ?? []}
            leavers={selection.leavers ?? false}
            onChange={(ids) => set({ people: ids.length > 0 ? ids : undefined })}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className={CHECKBOX}
              checked={selection.leavers ?? false}
              onChange={(event) => set({ leavers: event.target.checked || undefined })}
            />
            {m.people_show_leavers()}
          </label>
        </fieldset>
        <div className="flex flex-col gap-2">
          <span id="cv-language" className="text-sm font-medium">
            {m.cv_language()}
          </span>
          <RadioToggle
            name="cv-language"
            labelledBy="cv-language"
            options={LANGUAGES.map(({ locale, name }) => ({
              value: locale,
              label: name,
              lang: locale,
            }))}
            value={selection.lang ?? 'et'}
            onChange={(lang) => set({ lang: lang === 'et' ? undefined : lang })}
          />
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">{m.cv_projects()}</legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="cv-projects"
              className={CHECKBOX}
              checked={!filtering}
              onChange={() => chooseProjects(false)}
            />
            {m.cv_projects_all()}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="cv-projects"
              className={CHECKBOX}
              checked={filtering}
              onChange={() => chooseProjects(true)}
            />
            {m.cv_projects_filtered()}
          </label>
          {filtering && (
            <div className="flex flex-col gap-3 pt-2 pl-6">
              <TechnologyPicker
                id="cv-technology"
                label={m.search_technologies()}
                organizationId={organizationId}
                catalogue={catalogue}
                value={selection.t ?? []}
                onChange={(t) => set({ t: t.length > 0 ? t : undefined })}
                canAdd={false}
              />
              <RolePicker
                id="cv-roles"
                label={m.search_roles()}
                organizationId={organizationId}
                catalogue={roles}
                value={(selection.r ?? []).filter((id) => roles.some((role) => role.id === id))}
                onChange={(r) => set({ r: r.length > 0 ? r : undefined })}
                canAdd={false}
              />
              {criteria.length > 0 && (
                <CriteriaFilter
                  id="cv-criteria"
                  criteria={criteria}
                  value={(selection.c ?? []).filter((id) =>
                    criteria.some((criterion) => criterion.id === id),
                  )}
                  onChange={(c) => set({ c: c.length > 0 ? c : undefined })}
                />
              )}
              <PeriodFilter id="cv-period" value={selection} onChange={set} />
            </div>
          )}
        </fieldset>
        {(selection.people ?? []).length > 1 && (
          <div className="flex flex-col gap-2">
            <span id="cv-layout" className="text-sm font-medium">
              {m.cv_team_layout()}
            </span>
            <RadioToggle
              name="cv-layout"
              labelledBy="cv-layout"
              options={[
                { value: 'each', label: m.cv_layout_per_person() },
                { value: 'combined', label: m.cv_layout_combined() },
              ]}
              value={selection.layout ?? 'each'}
              onChange={(layout) => set({ layout: layout === 'each' ? undefined : layout })}
            />
          </div>
        )}
        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            id="cv-birth"
            className={`${CHECKBOX} mt-0.5`}
            aria-describedby="cv-birth-hint"
            checked={selection.birth ?? false}
            onChange={(event) => set({ birth: event.target.checked || undefined })}
          />
          <div className="flex flex-col gap-0.5">
            <label htmlFor="cv-birth" className="text-sm font-medium">
              {m.cv_include_birth_date()}
            </label>
            <p id="cv-birth-hint" className="text-muted-foreground text-sm">
              {m.cv_include_birth_date_hint()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function Result({
  organizationId,
  organization,
  selection,
}: {
  organizationId: string
  organization: string
  selection: CvSelection
}) {
  const cv = useQuery({
    ...cvQuery(organizationId, cvInput(selection)),
    placeholderData: keepPreviousData,
  })
  if (cv.error) {
    return (
      <p role="alert" className="text-destructive">
        {errorMessage(cv.error)}
      </p>
    )
  }
  if (!cv.data) return <p className="text-muted-foreground">{m.cv_making()}</p>
  return (
    <>
      {cv.data.missing.length > 0 && (
        <MissingTranslations organization={organization} missing={cv.data.missing} />
      )}
      <CvView
        cv={cv.data}
        layout={selection.layout ?? 'each'}
        documentHref={cvDocumentHref(organizationId, cvInput(selection))}
      />
    </>
  )
}

// A CV of one person or several, for admins (prototypes/cv.html). The selection lives in
// the URL, so search can link to it and a CV can be shared and reloaded.
export function CvPage({
  organizationId,
  organization,
  selection,
  onSelectionChange,
}: {
  organizationId: string
  // The organization's slug, for links.
  organization: string
  selection: CvSelection
  onSelectionChange: (selection: CvSelection) => void
}) {
  function set(next: Partial<CvSelection>) {
    onSelectionChange({ ...selection, ...next })
  }

  return (
    <main className="flex flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl">{m.cv_title()}</h1>
        <p className="text-muted-foreground text-sm">{m.cv_description()}</p>
      </div>
      <div className="grid items-start gap-6 2xl:grid-cols-[22rem_minmax(0,1fr)]">
        <Selection organizationId={organizationId} selection={selection} set={set} />
        <div className="flex min-w-0 flex-col gap-4">
          {(selection.people ?? []).length === 0 ? (
            <p className="text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">
              {m.cv_empty()}
            </p>
          ) : (
            <Result
              organizationId={organizationId}
              organization={organization}
              selection={selection}
            />
          )}
        </div>
      </div>
    </main>
  )
}

export function CvPending() {
  return (
    <main className="flex flex-col gap-6 p-4 md:p-8" aria-busy="true">
      <h1 className="text-3xl">{m.cv_title()}</h1>
      <div className="bg-muted h-64 max-w-5xl animate-pulse rounded-xl" />
    </main>
  )
}
