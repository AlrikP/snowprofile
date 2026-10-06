import { useSuspenseQuery } from '@tanstack/react-query'
import { BilingualText } from '#/components/bilingual-text'
import { Input } from '#/components/ui/input'
import { bilingualDisplay } from '#/lib/bilingual'
import { m } from '#/paraglide/messages.js'
import { getLocale } from '#/paraglide/runtime.js'
import { FormSection } from './form-section'
import { checklistQuery } from './projects-query'

// Each characteristic's answer as the form holds it; '' is unanswered.
export type AnswerInput = { answer: 'yes' | 'no' | ''; note: string }

export type AnswersInput = Record<string, AnswerInput>

const EMPTY: AnswerInput = { answer: '', note: '' }

export function answersInputValue(
  stored: { criterionId: string; answer: boolean; note: string | null }[],
): AnswersInput {
  return Object.fromEntries(
    stored.map(({ criterionId, answer, note }) => [
      criterionId,
      { answer: answer ? 'yes' : 'no', note: note ?? '' },
    ]),
  )
}

// The answers to save. An unanswered characteristic is left out, and its note with it.
export function parseAnswers(value: AnswersInput) {
  return Object.entries(value).flatMap(([criterionId, { answer, note }]) =>
    answer === '' ? [] : [{ criterionId, answer: answer === 'yes', note: note.trim() || null }],
  )
}

const OPTIONS = [
  { value: 'yes', label: m.answer_yes },
  { value: 'no', label: m.answer_no },
] as const

function AnswerToggle({
  name,
  labelledBy,
  value,
  onChange,
}: {
  name: string
  labelledBy: string
  value: AnswerInput['answer']
  onChange: (value: AnswerInput['answer']) => void
}) {
  const item =
    'hover:bg-muted has-checked:bg-foreground has-checked:text-background has-focus-visible:ring-ring/50 inline-flex h-8 min-w-9 cursor-pointer items-center justify-center gap-1 border-l px-3 text-sm font-medium whitespace-nowrap first:rounded-l-md first:border-l-0 last:rounded-r-md has-focus-visible:ring-[3px]'
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className="inline-flex w-fit items-center rounded-md border shadow-xs"
    >
      {OPTIONS.map((option) => (
        <label key={option.value} className={item}>
          <input
            type="radio"
            className="sr-only"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          {option.label()}
        </label>
      ))}
      <label className={item}>
        <input
          type="radio"
          className="sr-only"
          name={name}
          value=""
          checked={value === ''}
          onChange={() => onChange('')}
        />
        <span aria-hidden="true">—</span>
        <span className="sr-only">{m.answer_none()}</span>
      </label>
    </div>
  )
}

// The live checklist, each answered yes, no, or not at all, with an internal note.
export function ProjectCriteria({
  organizationId,
  value,
  onChange,
}: {
  organizationId: string
  value: AnswersInput
  onChange: (value: AnswersInput) => void
}) {
  const { data: checklist } = useSuspenseQuery(checklistQuery(organizationId))

  function set(criterionId: string, next: Partial<AnswerInput>) {
    onChange({ ...value, [criterionId]: { ...(value[criterionId] ?? EMPTY), ...next } })
  }

  return (
    <FormSection
      id="section-criteria"
      title={m.project_section_criteria()}
      hint={m.project_section_criteria_hint()}
    >
      <ul className="flex flex-col divide-y">
        {checklist.map((criterion) => {
          const nameId = `criterion-${criterion.id}-name`
          const current = value[criterion.id] ?? EMPTY
          const label = bilingualDisplay(criterion.name, getLocale())?.text ?? ''
          return (
            <li
              key={criterion.id}
              className="grid gap-2 py-3 sm:grid-cols-[1fr_auto] sm:items-center md:grid-cols-[1fr_auto_minmax(0,18rem)]"
            >
              <span id={nameId} className="font-medium">
                <BilingualText value={criterion.name} />
              </span>
              <AnswerToggle
                name={`criterion-${criterion.id}`}
                labelledBy={nameId}
                value={current.answer}
                onChange={(answer) => set(criterion.id, { answer })}
              />
              <Input
                className="sm:col-span-2 md:col-span-1"
                aria-label={m.criterion_note_for({ name: label })}
                placeholder={m.criterion_note()}
                value={current.note}
                onChange={(event) => set(criterion.id, { note: event.target.value })}
              />
            </li>
          )
        })}
      </ul>
    </FormSection>
  )
}
