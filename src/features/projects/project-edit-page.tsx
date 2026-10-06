import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeftIcon, PlusIcon, Trash2Icon, TriangleAlertIcon } from 'lucide-react'
import { type FormEvent, type ReactNode, useState } from 'react'
import { v7 as uuidv7 } from 'uuid'
import { ApproximateNumberInput } from '#/components/approximate-number-input'
import { BilingualField } from '#/components/bilingual-field'
import { PeriodInput } from '#/components/period-input'
import { Alert, AlertDescription } from '#/components/ui/alert'
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
import { NativeSelect, NativeSelectOption } from '#/components/ui/native-select'
import { approximateNumberInputValue, parseApproximateNumber } from '#/lib/approximate-number'
import { bilingualInputValue, parseBilingual } from '#/lib/bilingual'
import { formatDateTime } from '#/lib/date-time'
import { errorMessage } from '#/lib/errors'
import { normalizeName } from '#/lib/normalize-name'
import { parsePeriodInput, periodInputValue } from '#/lib/period'
import { m } from '#/paraglide/messages.js'
import {
  createProject,
  type ProjectForm,
  updateProject,
} from '#/server/projects/projects.functions'
import { CustomerDialog } from './customer-dialog'
import { DeleteProjectDialog } from './delete-project-dialog'
import { FormSection } from './form-section'
import { type ContactsCustomer, ProjectContacts } from './project-contacts'
import { answersInputValue, parseAnswers, ProjectCriteria } from './project-criteria'
import { ProjectTechnologies } from './project-technologies'
import { customersQuery, projectFormQuery, projectsKey, projectsQuery } from './projects-query'

function initialValues(stored: ProjectForm | null) {
  return {
    name: stored?.name ?? '',
    customerId: stored?.customerId ?? '',
    contactIds: stored?.contactIds ?? [],
    technologyIds: stored?.technologyIds ?? [],
    answers: answersInputValue(stored?.answers ?? []),
    description: bilingualInputValue(stored?.description ?? null),
    // A new project starts as ongoing, as most are added while they run.
    period: stored
      ? periodInputValue(stored.startDate, stored.endDate)
      : periodInputValue(null, null, { ongoing: true }),
    tenderReference: stored?.tenderReference ?? '',
    totalHours: approximateNumberInputValue(stored?.totalHours ?? null),
    cost: approximateNumberInputValue(stored?.cost ?? null),
  }
}

type FormProps = {
  organizationId: string
  // The organization's slug, for links.
  organization: string
  stored: ProjectForm | null
  canDelete: boolean
}

function ProjectFormBody({ organizationId, organization, stored, canDelete }: FormProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { data: customers } = useSuspenseQuery(customersQuery(organizationId))
  const { data: projects } = useSuspenseQuery(projectsQuery(organizationId))
  const [values, setValues] = useState(() => initialValues(stored))
  // Customers added in this form, stored when the project is saved.
  const [added, setAdded] = useState<{ id: string; name: string }[]>([])
  const [customerOpen, setCustomerOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  // A customer chosen while the project has contacts, waiting for the admin to confirm.
  const [pendingCustomer, setPendingCustomer] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const name = values.name.trim()
  const period = parsePeriodInput(values.period)
  const totalHours = parseApproximateNumber(values.totalHours)
  const cost = parseApproximateNumber(values.cost)
  const valid = name !== '' && period.ok && totalHours.ok && cost.ok
  const normalized = normalizeName(name)
  const similar = normalized
    ? projects.find((each) => each.id !== stored?.id && normalizeName(each.name) === normalized)
    : undefined

  function set<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function addCustomer(customerName: string) {
    const key = customerName.toLocaleLowerCase()
    const existing = [...customers, ...added].find((each) => each.name.toLocaleLowerCase() === key)
    const id = existing?.id ?? uuidv7()
    if (!existing) setAdded((current) => [...current, { id, name: customerName }])
    setCustomerOpen(false)
    chooseCustomer(id)
  }

  // The contacts are the current customer's, so another customer asks before unlinking them.
  function chooseCustomer(customerId: string) {
    if (customerId === values.customerId) return
    if (values.contactIds.length > 0) setPendingCustomer(customerId)
    else set('customerId', customerId)
  }

  function contactsCustomer(): ContactsCustomer {
    if (!values.customerId) return { kind: 'none' }
    if (added.some((each) => each.id === values.customerId)) return { kind: 'new' }
    return { kind: 'stored', id: values.customerId }
  }

  function customerChoice() {
    if (!values.customerId) return null
    const fresh = added.find((each) => each.id === values.customerId)
    return fresh
      ? { kind: 'new' as const, id: fresh.id, name: fresh.name }
      : { kind: 'existing' as const, id: values.customerId }
  }

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: projectsKey(organizationId) }),
      queryClient.invalidateQueries(customersQuery(organizationId)),
    ])
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!period.ok || !totalHours.ok || !cost.ok || period.startDate === null) return null
      const fields = {
        name,
        description: parseBilingual(values.description),
        customer: customerChoice(),
        period: { startDate: period.startDate, endDate: period.endDate },
        tenderReference: values.tenderReference,
        totalHours: totalHours.value,
        cost: cost.value,
        contactIds: values.contactIds,
        technologyIds: values.technologyIds,
        answers: parseAnswers(values.answers),
      }
      if (stored) {
        await updateProject({ data: { organizationId, projectId: stored.id, ...fields } })
        return stored.id
      }
      return (await createProject({ data: { organizationId, id: uuidv7(), ...fields } })).id
    },
    onSuccess: async (projectId) => {
      if (!projectId) return
      await refresh()
      await navigate({
        to: '/$organization/projects/$projectId',
        params: { organization, projectId },
      })
    },
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (valid) save.mutate()
  }

  const periodErrors = submitted && !period.ok ? period : {}

  return (
    <>
      <form onSubmit={submit} noValidate className="flex max-w-5xl flex-col gap-6">
        <FormSection id="section-general" title={m.project_section_general()}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="project-name">{m.project_name()}</Label>
            <Input
              id="project-name"
              value={values.name}
              onChange={(event) => set('name', event.target.value)}
              aria-invalid={(submitted && !name) || undefined}
              aria-describedby="project-name-hint"
            />
            {similar && (
              <Alert role="status">
                <TriangleAlertIcon />
                <AlertDescription className="text-foreground">
                  <p>
                    {m.project_similar({
                      name: similar.name,
                      customer: similar.customerName ?? m.projects_no_customer(),
                    })}
                  </p>
                  <Button asChild variant="outline" size="sm" className="mt-1">
                    <Link
                      to="/$organization/projects/$projectId"
                      params={{ organization, projectId: similar.id }}
                    >
                      {m.project_open_existing()}
                    </Link>
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            <p id="project-name-hint" className="text-muted-foreground text-sm">
              {m.project_name_hint()}
            </p>
            {submitted && !name && (
              <p className="text-destructive text-sm">{m.project_name_required()}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="project-customer">{m.project_customer()}</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <NativeSelect
                id="project-customer"
                value={values.customerId}
                onChange={(event) => chooseCustomer(event.target.value)}
              >
                <NativeSelectOption value="">{m.projects_no_customer()}</NativeSelectOption>
                {[...customers, ...added].map((customer) => (
                  <NativeSelectOption key={customer.id} value={customer.id}>
                    {customer.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <Button
                type="button"
                variant="outline"
                className="shrink-0"
                onClick={() => setCustomerOpen(true)}
              >
                <PlusIcon />
                {m.project_customer_new()}
              </Button>
            </div>
          </div>
          <PeriodInput
            id="project-period"
            legend={m.projects_col_period()}
            value={values.period}
            onChange={(value) => set('period', value)}
            errors={periodErrors}
          />
        </FormSection>

        <FormSection
          id="section-description"
          title={m.project_section_description()}
          hint={m.project_section_description_hint()}
        >
          <BilingualField
            id="project-description"
            legend={m.project_section_description()}
            hideLegend
            multiline
            value={values.description}
            onChange={(value) => set('description', value)}
          />
        </FormSection>

        <FormSection
          id="section-tender"
          title={m.project_section_tender()}
          hint={m.project_section_tender_hint()}
        >
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="tender-reference">{m.project_tender_reference()}</Label>
              <Input
                id="tender-reference"
                value={values.tenderReference}
                onChange={(event) => set('tenderReference', event.target.value)}
              />
            </div>
            <ApproximateNumberInput
              id="project-hours"
              legend={m.project_hours()}
              value={values.totalHours}
              onChange={(value) => set('totalHours', value)}
              invalid={submitted && !totalHours.ok}
            />
            <ApproximateNumberInput
              id="project-cost"
              legend={m.project_cost()}
              value={values.cost}
              onChange={(value) => set('cost', value)}
              invalid={submitted && !cost.ok}
            />
          </div>
        </FormSection>

        <ProjectContacts
          organizationId={organizationId}
          customer={contactsCustomer()}
          value={values.contactIds}
          onChange={(contactIds) => set('contactIds', contactIds)}
        />

        <ProjectTechnologies
          organizationId={organizationId}
          participantTechnologies={stored?.participantTechnologies ?? []}
          value={values.technologyIds}
          onChange={(technologyIds) => set('technologyIds', technologyIds)}
        />

        <ProjectCriteria
          organizationId={organizationId}
          value={values.answers}
          onChange={(answers) => set('answers', answers)}
        />

        {save.error && (
          <p role="alert" className="text-destructive text-sm">
            {errorMessage(save.error)}
          </p>
        )}
        <div className="bg-background/95 sticky bottom-0 -mx-4 flex flex-wrap justify-end gap-2 border-t px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
          {stored && canDelete && (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive mr-auto"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2Icon />
              {m.project_delete()}
            </Button>
          )}
          <Button asChild variant="outline">
            {stored ? (
              <Link
                to="/$organization/projects/$projectId"
                params={{ organization, projectId: stored.id }}
              >
                {m.action_cancel()}
              </Link>
            ) : (
              <Link to="/$organization/projects" params={{ organization }}>
                {m.action_cancel()}
              </Link>
            )}
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {m.action_save()}
          </Button>
        </div>
      </form>
      <Dialog
        open={pendingCustomer !== null}
        onOpenChange={(open) => !open && setPendingCustomer(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{m.contacts_change_customer_title()}</DialogTitle>
            <DialogDescription>
              {m.contacts_change_customer_body({ count: values.contactIds.length })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                {m.action_cancel()}
              </Button>
            </DialogClose>
            <Button
              type="button"
              onClick={() => {
                setValues((current) => ({
                  ...current,
                  customerId: pendingCustomer ?? '',
                  contactIds: [],
                }))
                setPendingCustomer(null)
              }}
            >
              {m.contacts_change_customer_confirm()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <CustomerDialog
        open={customerOpen}
        onClose={() => setCustomerOpen(false)}
        onAdd={addCustomer}
      />
      {stored && (
        <DeleteProjectDialog
          organizationId={organizationId}
          project={stored}
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          onDeleted={async () => {
            await navigate({ to: '/$organization/projects', params: { organization } })
            await refresh()
          }}
        />
      )}
    </>
  )
}

function PageFrame({
  organization,
  title,
  lastChange,
  children,
}: {
  organization: string
  title: string
  lastChange?: ProjectForm['lastChange']
  children: ReactNode
}) {
  const at = lastChange && formatDateTime(lastChange.at)
  return (
    <main className="flex flex-col gap-6 p-4 pb-0 md:p-8 md:pb-0">
      <div className="flex flex-col gap-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2 self-start">
          <Link to="/$organization/projects" params={{ organization }}>
            <ArrowLeftIcon />
            {m.action_back_to_projects()}
          </Link>
        </Button>
        <h1 className="text-3xl">{title}</h1>
        {lastChange && at && (
          <p className="text-muted-foreground text-xs">
            {lastChange.by === null
              ? m.project_last_change_system({ at })
              : m.project_last_change({ at, name: lastChange.by })}
          </p>
        )}
      </div>
      {children}
    </main>
  )
}

function EditProject(props: Omit<FormProps, 'stored'> & { projectId: string }) {
  const { data: stored } = useSuspenseQuery(projectFormQuery(props.organizationId, props.projectId))
  return (
    <PageFrame organization={props.organization} title={stored.name} lastChange={stored.lastChange}>
      <ProjectFormBody {...props} stored={stored} />
    </PageFrame>
  )
}

// The admin's project form: a new project when projectId is null
// (prototypes/project-edit.html).
export function ProjectEditPage({
  projectId,
  ...props
}: Omit<FormProps, 'stored'> & { projectId: string | null }) {
  if (projectId !== null) return <EditProject {...props} projectId={projectId} />
  return (
    <PageFrame organization={props.organization} title={m.project_new_title()}>
      <ProjectFormBody {...props} stored={null} />
    </PageFrame>
  )
}

export function ProjectEditPending() {
  return (
    <main className="flex flex-col gap-6 p-4 md:p-8" aria-busy="true">
      <div className="bg-muted h-10 w-2/3 animate-pulse rounded-md" />
      <div className="bg-muted h-96 max-w-5xl animate-pulse rounded-xl" />
    </main>
  )
}
