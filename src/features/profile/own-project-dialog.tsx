import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { Trash2Icon } from 'lucide-react'
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
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { approximateNumberInputValue, parseApproximateNumber } from '#/lib/approximate-number'
import { bilingualInputValue, parseBilingual } from '#/lib/bilingual'
import { errorMessage } from '#/lib/errors'
import { parsePeriodInput, periodInputValue } from '#/lib/period'
import { roleCatalogueQuery } from '#/lib/role-catalogue'
import { technologyCatalogueQuery } from '#/lib/technology-catalogue'
import { m } from '#/paraglide/messages.js'
import {
  addOwnProject,
  deleteOwnProject,
  type OwnProject,
  updateOwnProject,
} from '#/server/profiles/profiles.functions'
import { myOwnProjectsQuery, myProfileQuery } from './profile-query'

type FormProps = {
  organizationId: string
  // The own project to edit, or null to add one.
  ownProject: OwnProject | null
  onDone: () => void
}

function useRefresh(organizationId: string) {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries(myOwnProjectsQuery(organizationId)),
      queryClient.invalidateQueries(myProfileQuery(organizationId)),
    ])
}

function ConfirmDelete({
  organizationId,
  ownProject,
  onBack,
  onDone,
}: {
  organizationId: string
  ownProject: OwnProject
  onBack: () => void
  onDone: () => void
}) {
  const refresh = useRefresh(organizationId)
  const remove = useMutation({
    mutationFn: () => deleteOwnProject({ data: { organizationId, ownProjectId: ownProject.id } }),
    onSuccess: async () => {
      await refresh()
      onDone()
    },
  })
  return (
    <div className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{m.own_title()}</DialogTitle>
        <DialogDescription>{m.own_delete_confirm({ name: ownProject.name })}</DialogDescription>
      </DialogHeader>
      {remove.error && <p role="alert">{errorMessage(remove.error)}</p>}
      <DialogFooter>
        <Button type="button" variant="outline" data-no-change onClick={onBack}>
          {m.action_cancel()}
        </Button>
        <Button
          type="button"
          data-no-change
          variant="destructive"
          disabled={remove.isPending}
          onClick={() => remove.mutate()}
        >
          <Trash2Icon />
          {m.own_delete()}
        </Button>
      </DialogFooter>
    </div>
  )
}

function initialValues(stored: OwnProject | null) {
  return {
    name: stored?.name ?? '',
    employer: stored?.employer ?? '',
    customerName: stored?.customerName ?? '',
    period: periodInputValue(stored?.startDate ?? null, stored?.endDate ?? null),
    description: bilingualInputValue(stored?.description ?? null),
    roleIds: stored?.roles.map((role) => role.id) ?? [],
    hours: approximateNumberInputValue(stored?.hours ?? null),
    tasks: bilingualInputValue(stored?.tasks ?? null),
    technologyIds: stored?.technologies.map((technology) => technology.id) ?? [],
    tenderReference: stored?.tenderReference ?? '',
    totalHours: approximateNumberInputValue(stored?.totalHours ?? null),
    cost: approximateNumberInputValue(stored?.cost ?? null),
  }
}

// Mounted only while the dialog is open, so each opening starts from the stored values.
function OwnProjectForm({ organizationId, ownProject, onDone }: FormProps) {
  const { data: roles } = useSuspenseQuery(roleCatalogueQuery(organizationId))
  const { data: catalogue } = useSuspenseQuery(technologyCatalogueQuery(organizationId))
  const refresh = useRefresh(organizationId)
  const [values, setValues] = useState(() => initialValues(ownProject))
  const [submitted, setSubmitted] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const name = values.name.trim()
  const period = parsePeriodInput(values.period)
  const hours = parseApproximateNumber(values.hours)
  const totalHours = parseApproximateNumber(values.totalHours)
  const cost = parseApproximateNumber(values.cost)
  const valid =
    name !== '' && values.roleIds.length > 0 && period.ok && hours.ok && totalHours.ok && cost.ok

  const save = useMutation({
    mutationFn: async () => {
      if (!period.ok || !hours.ok || !totalHours.ok || !cost.ok || period.startDate === null) {
        return
      }
      const fields = {
        name,
        employer: values.employer,
        customerName: values.customerName,
        description: parseBilingual(values.description),
        period: { startDate: period.startDate, endDate: period.endDate },
        roleIds: values.roleIds,
        hours: hours.value,
        tasks: parseBilingual(values.tasks),
        technologyIds: values.technologyIds,
        totalHours: totalHours.value,
        cost: cost.value,
        tenderReference: values.tenderReference,
      }
      if (ownProject) {
        await updateOwnProject({ data: { organizationId, ownProjectId: ownProject.id, ...fields } })
      } else {
        await addOwnProject({ data: { organizationId, id: uuidv7(), ...fields } })
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

  function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (valid) save.mutate()
  }

  if (ownProject && confirming) {
    return (
      <ConfirmDelete
        organizationId={organizationId}
        ownProject={ownProject}
        onBack={() => setConfirming(false)}
        onDone={onDone}
      />
    )
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{m.own_title()}</DialogTitle>
        <DialogDescription>{m.profile_section_own_hint()}</DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        <Label htmlFor="own-name">{m.own_name()}</Label>
        <Input
          id="own-name"
          value={values.name}
          onChange={(event) => set('name', event.target.value)}
          aria-invalid={(submitted && !name) || undefined}
        />
        {submitted && !name && <p className="text-destructive text-sm">{m.own_name_required()}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="own-employer">{m.own_employer()}</Label>
          <Input
            id="own-employer"
            value={values.employer}
            onChange={(event) => set('employer', event.target.value)}
            aria-describedby="own-employer-hint"
          />
          <p id="own-employer-hint" className="text-muted-foreground text-sm">
            {m.own_employer_hint()}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="own-customer">{m.own_customer()}</Label>
          <Input
            id="own-customer"
            value={values.customerName}
            onChange={(event) => set('customerName', event.target.value)}
          />
        </div>
      </div>
      <PeriodInput
        id="own-period"
        legend={m.projects_col_period()}
        value={values.period}
        onChange={(value) => set('period', value)}
        errors={submitted && !period.ok ? period : {}}
      />
      <BilingualField
        id="own-description"
        legend={m.project_section_description()}
        multiline
        value={values.description}
        onChange={(value) => set('description', value)}
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm leading-none font-medium">{m.participation_roles()}</legend>
        <RolePicker
          id="own-roles"
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
          id="own-hours"
          legend={m.participation_hours()}
          value={values.hours}
          onChange={(value) => set('hours', value)}
          invalid={submitted && !hours.ok}
        />
      </div>
      <BilingualField
        id="own-tasks"
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
          id="own-technologies"
          label={m.participation_technologies()}
          organizationId={organizationId}
          catalogue={catalogue}
          value={values.technologyIds}
          onChange={(technologyIds) => set('technologyIds', technologyIds)}
        />
      </fieldset>
      <details
        className="rounded-md border px-4 py-3"
        open={submitted && (!totalHours.ok || !cost.ok) ? true : undefined}
      >
        <summary className="cursor-pointer text-sm font-medium">{m.own_project_details()}</summary>
        <div className="mt-4 flex flex-col gap-4">
          <p className="text-muted-foreground text-sm">{m.own_project_details_hint()}</p>
          <div className="flex flex-col gap-2">
            <Label htmlFor="own-tender">{m.project_tender_reference()}</Label>
            <Input
              id="own-tender"
              value={values.tenderReference}
              onChange={(event) => set('tenderReference', event.target.value)}
            />
          </div>
          <div className="max-w-sm">
            <ApproximateNumberInput
              id="own-total-hours"
              legend={m.project_hours()}
              value={values.totalHours}
              onChange={(value) => set('totalHours', value)}
              invalid={submitted && !totalHours.ok}
            />
          </div>
          <div className="max-w-sm">
            <ApproximateNumberInput
              id="own-cost"
              legend={m.project_cost()}
              value={values.cost}
              onChange={(value) => set('cost', value)}
              invalid={submitted && !cost.ok}
            />
          </div>
        </div>
      </details>
      {save.error && <p role="alert">{errorMessage(save.error)}</p>}
      <DialogFooter className="sm:justify-between">
        {ownProject ? (
          <Button
            type="button"
            data-no-change
            variant="ghost"
            className="text-destructive"
            onClick={() => setConfirming(true)}
          >
            <Trash2Icon />
            {m.own_delete()}
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

// Adds an own project, or edits or deletes one.
export function OwnProjectDialog({
  open,
  onClose,
  ...props
}: Omit<FormProps, 'onDone'> & { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        {open && <OwnProjectForm {...props} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  )
}
