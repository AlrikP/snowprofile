import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { PlusIcon, Trash2Icon } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { v7 as uuidv7 } from 'uuid'
import { ApproximateNumberInput } from '#/components/approximate-number-input'
import { BilingualField } from '#/components/bilingual-field'
import { PeriodInput } from '#/components/period-input'
import { RolePicker } from '#/components/role-picker'
import { TechnologyPicker } from '#/components/technology-picker'
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
import { Label } from '#/components/ui/label'
import { NativeSelect, NativeSelectOption } from '#/components/ui/native-select'
import { approximateNumberInputValue, parseApproximateNumber } from '#/lib/approximate-number'
import { bilingualInputValue, parseBilingual } from '#/lib/bilingual'
import { errorMessage } from '#/lib/errors'
import { formatPeriod, parsePeriodInput, periodInputValue } from '#/lib/period'
import { projectsKey, projectsQuery } from '#/lib/project-list'
import { roleCatalogueQuery } from '#/lib/role-catalogue'
import { technologyCatalogueQuery } from '#/lib/technology-catalogue'
import { m } from '#/paraglide/messages.js'
import {
  addParticipation,
  deleteParticipation,
  type Participation,
  updateParticipation,
} from '#/server/profiles/profiles.functions'
import { myParticipationsQuery, myProfileQuery } from './profile-query'

type FormProps = {
  organizationId: string
  // The participation to edit, or null to add one.
  participation: Participation | null
  onDone: () => void
}

function useRefresh(organizationId: string) {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries(myParticipationsQuery(organizationId)),
      queryClient.invalidateQueries(myProfileQuery(organizationId)),
      // Project pages list their people.
      queryClient.invalidateQueries({ queryKey: projectsKey(organizationId) }),
    ])
}

function ConfirmDelete({
  organizationId,
  participation,
  onBack,
  onDone,
}: {
  organizationId: string
  participation: Participation
  onBack: () => void
  onDone: () => void
}) {
  const refresh = useRefresh(organizationId)
  const remove = useMutation({
    mutationFn: () =>
      deleteParticipation({ data: { organizationId, participationId: participation.id } }),
    onSuccess: async () => {
      await refresh()
      onDone()
    },
  })
  return (
    <div className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{m.participation_title()}</DialogTitle>
        <DialogDescription>
          {m.participation_delete_confirm({ name: participation.projectName })}
        </DialogDescription>
      </DialogHeader>
      {remove.error && <p role="alert">{errorMessage(remove.error)}</p>}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onBack}>
          {m.action_cancel()}
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={remove.isPending}
          onClick={() => remove.mutate()}
        >
          <Trash2Icon />
          {m.participation_delete()}
        </Button>
      </DialogFooter>
    </div>
  )
}

// Mounted only while the dialog is open, so each opening starts from the stored values.
function ParticipationForm({ organizationId, participation, onDone }: FormProps) {
  const { data: projects } = useSuspenseQuery(projectsQuery(organizationId))
  const { data: roles } = useSuspenseQuery(roleCatalogueQuery(organizationId))
  const { data: catalogue } = useSuspenseQuery(technologyCatalogueQuery(organizationId))
  const refresh = useRefresh(organizationId)
  const [values, setValues] = useState({
    projectId: participation?.projectId ?? '',
    period: periodInputValue(participation?.startDate ?? null, participation?.endDate ?? null),
    roleIds: participation?.roles.map((role) => role.id) ?? [],
    hours: approximateNumberInputValue(participation?.hours ?? null),
    tasks: bilingualInputValue(participation?.tasks ?? null),
    technologyIds: participation?.technologies.map((technology) => technology.id) ?? [],
  })
  const [submitted, setSubmitted] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const period = parsePeriodInput(values.period)
  const hours = parseApproximateNumber(values.hours)
  const valid = values.projectId !== '' && values.roleIds.length > 0 && period.ok && hours.ok

  const save = useMutation({
    mutationFn: async () => {
      if (!period.ok || !hours.ok || period.startDate === null) return
      const fields = {
        projectId: values.projectId,
        period: { startDate: period.startDate, endDate: period.endDate },
        roleIds: values.roleIds,
        hours: hours.value,
        tasks: parseBilingual(values.tasks),
        technologyIds: values.technologyIds,
      }
      if (participation) {
        await updateParticipation({
          data: { organizationId, participationId: participation.id, ...fields },
        })
      } else {
        await addParticipation({ data: { organizationId, id: uuidv7(), ...fields } })
      }
    },
    onSuccess: async () => {
      await refresh()
      onDone()
    },
  })

  function set<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  // The chosen project's technologies the person's list lacks, offered one click each.
  // Computed when shown; nothing records them.
  const chosenProject = projects.find((project) => project.id === values.projectId)
  const projectTechnologies = chosenProject?.technologies ?? []
  const suggestions = projectTechnologies.filter(
    (technology) => !values.technologyIds.includes(technology.id),
  )

  // A new participation starts from the project's technologies; the person then removes the
  // ones they didn't use. A saved one keeps its own list whatever the project lists.
  function chooseProject(projectId: string) {
    setValues((current) => ({
      ...current,
      projectId,
      technologyIds: participation
        ? current.technologyIds
        : (projects.find((project) => project.id === projectId)?.technologies ?? []).map(
            (technology) => technology.id,
          ),
    }))
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (valid) save.mutate()
  }

  if (participation && confirming) {
    return (
      <ConfirmDelete
        organizationId={organizationId}
        participation={participation}
        onBack={() => setConfirming(false)}
        onDone={onDone}
      />
    )
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{m.participation_title()}</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        <Label htmlFor="participation-project">{m.participation_project()}</Label>
        <NativeSelect
          id="participation-project"
          value={values.projectId}
          onChange={(event) => chooseProject(event.target.value)}
          aria-invalid={(submitted && !values.projectId) || undefined}
          aria-describedby={chosenProject ? 'participation-project-period' : undefined}
        >
          <NativeSelectOption value="">{m.participation_project_choose()}</NativeSelectOption>
          {projects.map((project) => (
            <NativeSelectOption key={project.id} value={project.id}>
              {project.customerName ? `${project.name} (${project.customerName})` : project.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        {chosenProject && (
          <p id="participation-project-period" className="text-muted-foreground text-sm">
            {m.participation_project_period({
              period: formatPeriod(chosenProject.startDate, chosenProject.endDate),
            })}
          </p>
        )}
        {submitted && !values.projectId && (
          <p className="text-destructive text-sm">{m.participation_project_required()}</p>
        )}
      </div>
      <PeriodInput
        id="participation-period"
        legend={m.projects_col_period()}
        value={values.period}
        onChange={(value) => set('period', value)}
        errors={submitted && !period.ok ? period : {}}
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm leading-none font-medium">{m.participation_roles()}</legend>
        <RolePicker
          id="participation-roles"
          label={m.participation_roles()}
          organizationId={organizationId}
          catalogue={roles}
          value={values.roleIds}
          onChange={(roleIds) => set('roleIds', roleIds)}
        />
        {submitted && values.roleIds.length === 0 && (
          <p className="text-destructive text-sm">{m.participation_roles_required()}</p>
        )}
      </fieldset>
      <div className="max-w-sm">
        <ApproximateNumberInput
          id="participation-hours"
          legend={m.participation_hours()}
          value={values.hours}
          onChange={(value) => set('hours', value)}
          invalid={submitted && !hours.ok}
        />
      </div>
      <BilingualField
        id="participation-tasks"
        legend={m.participation_tasks()}
        multiline
        value={values.tasks}
        onChange={(value) => set('tasks', value)}
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm leading-none font-medium">
          {m.participation_technologies()}
        </legend>
        <TechnologyPicker
          id="participation-technologies"
          label={m.participation_technologies()}
          organizationId={organizationId}
          catalogue={catalogue}
          value={values.technologyIds}
          onChange={(technologyIds) => set('technologyIds', technologyIds)}
        />
        {suggestions.length > 0 && (
          <div
            className="flex flex-wrap items-center gap-2"
            role="group"
            aria-labelledby="participation-project-suggestions"
          >
            <span id="participation-project-suggestions" className="text-muted-foreground text-sm">
              {m.participation_project_suggestions()}
            </span>
            {suggestions.map((technology) => (
              <button
                key={technology.id}
                type="button"
                className="hover:bg-muted inline-flex h-7 items-center gap-1 rounded-md border border-dashed px-2.5 text-sm"
                aria-label={m.participation_add_project_technology({ name: technology.name })}
                onClick={() => set('technologyIds', [...values.technologyIds, technology.id])}
              >
                <PlusIcon className="size-3.5" />
                {technology.name}
              </button>
            ))}
          </div>
        )}
        <p className="text-muted-foreground text-sm">{m.participation_technologies_hint()}</p>
      </fieldset>
      {save.error && <p role="alert">{errorMessage(save.error)}</p>}
      <DialogFooter className="sm:justify-between">
        {participation ? (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive"
            onClick={() => setConfirming(true)}
          >
            <Trash2Icon />
            {m.participation_delete()}
          </Button>
        ) : (
          <span />
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              {m.action_cancel()}
            </Button>
          </DialogClose>
          <Button type="submit" disabled={save.isPending}>
            {m.action_save()}
          </Button>
        </div>
      </DialogFooter>
    </form>
  )
}

// Adds a participation in an organization project, or edits or deletes one.
export function ParticipationDialog({
  open,
  onClose,
  ...props
}: Omit<FormProps, 'onDone'> & { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        {open && <ParticipationForm {...props} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  )
}
