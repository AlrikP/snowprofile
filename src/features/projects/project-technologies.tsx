import { useSuspenseQuery } from '@tanstack/react-query'
import { TechnologyPicker } from '#/components/technology-picker'
import { technologyCatalogueQuery } from '#/lib/technology-catalogue'
import { m } from '#/paraglide/messages.js'
import type { ProjectForm } from '#/server/projects/projects.functions'
import { FormSection } from './form-section'
import { ParticipantTechnologies } from './participant-technologies'

// The project's technologies, picked from the catalogue (prototypes/project-edit.html, state
// technology).
export function ProjectTechnologies({
  organizationId,
  participantTechnologies,
  value,
  onChange,
}: {
  organizationId: string
  participantTechnologies: ProjectForm['participantTechnologies']
  value: string[]
  onChange: (value: string[]) => void
}) {
  const { data: catalogue } = useSuspenseQuery(technologyCatalogueQuery(organizationId))
  return (
    <FormSection id="section-technologies" title={m.project_section_technologies()}>
      <TechnologyPicker
        id="project-technologies"
        label={m.project_section_technologies()}
        organizationId={organizationId}
        catalogue={catalogue}
        value={value}
        onChange={onChange}
      />
      <ParticipantTechnologies
        technologies={participantTechnologies.filter((each) => !value.includes(each.id))}
        onAdd={(technologyId) => onChange([...value, technologyId])}
      />
    </FormSection>
  )
}
