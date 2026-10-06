import { PlusIcon } from 'lucide-react'
import { m } from '#/paraglide/messages.js'
import type { ProjectForm } from '#/server/projects/projects.functions'

type ParticipantTechnology = ProjectForm['participantTechnologies'][number]

// Technologies participants used that the project doesn't list, each a button that adds it
// to the project. Participations never change by it.
export function ParticipantTechnologies({
  technologies,
  onAdd,
  disabled = false,
}: {
  technologies: ParticipantTechnology[]
  onAdd: (technologyId: string) => void
  disabled?: boolean
}) {
  if (technologies.length === 0) return null
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium" id="participant-technologies">
        {m.project_participant_technologies()}
      </p>
      <div className="flex flex-wrap gap-2" role="group" aria-labelledby="participant-technologies">
        {technologies.map((technology) => (
          <button
            key={technology.id}
            type="button"
            disabled={disabled}
            className="hover:bg-muted inline-flex h-7 items-center gap-1 rounded-md border border-dashed px-2.5 text-sm disabled:opacity-50"
            aria-label={m.project_add_participant_technology({
              name: technology.name,
              count: technology.people,
            })}
            onClick={() => onAdd(technology.id)}
          >
            <PlusIcon className="size-3.5" />
            {technology.name}
            <span className="text-muted-foreground">· {technology.people}</span>
          </button>
        ))}
      </div>
      <p className="text-muted-foreground text-sm">{m.project_participant_technologies_hint()}</p>
    </div>
  )
}
