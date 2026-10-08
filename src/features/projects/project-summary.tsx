import { useQuery } from '@tanstack/react-query'
import { BilingualText } from '#/components/bilingual-text'
import { errorMessage } from '#/lib/errors'
import { categoryName, technologyCatalogueQuery } from '#/lib/technology-catalogue'
import { m } from '#/paraglide/messages.js'
import { projectQuery } from './projects-query'

// A project's every technology, by category, and the characteristics it answers yes, for
// a row of the projects list. Read only when the row opens, from the project page's own
// query, so the list stays light and shows nothing the project page doesn't. Notes stay on
// the project page.
export function ProjectSummary({
  organizationId,
  projectId,
}: {
  organizationId: string
  projectId: string
}) {
  const project = useQuery(projectQuery(organizationId, projectId))
  const catalogue = useQuery(technologyCatalogueQuery(organizationId))
  const error = project.error ?? catalogue.error
  if (error) return <p role="alert">{errorMessage(error)}</p>
  if (!project.data || !catalogue.data) {
    return <p className="text-muted-foreground">{m.projects_summary_loading()}</p>
  }

  const categoryOf = new Map(catalogue.data.technologies.map((each) => [each.id, each.categoryId]))
  const groups = catalogue.data.categories
    .map((category) => ({
      category,
      technologies: project.data.technologies.filter(
        (technology) => categoryOf.get(technology.id) === category.id,
      ),
    }))
    .filter((group) => group.technologies.length > 0)
  const yes = project.data.criteria.filter((criterion) => criterion.answer === true)

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="flex flex-col gap-2">
        <h3 className="font-medium">{m.projects_col_technologies()}</h3>
        {groups.length === 0 ? (
          <p className="text-muted-foreground">{m.projects_summary_no_technologies()}</p>
        ) : (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            {groups.map(({ category, technologies }) => (
              <div key={category.id} className="contents">
                <dt className="text-muted-foreground">{categoryName(category)}</dt>
                <dd>{technologies.map((technology) => technology.name).join(', ')}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>
      <section className="flex flex-col gap-2">
        <h3 className="font-medium">{m.project_section_criteria()}</h3>
        {yes.length === 0 ? (
          <p className="text-muted-foreground">{m.projects_summary_no_characteristics()}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {yes.map((criterion) => (
              <li key={criterion.id}>
                <BilingualText value={criterion.name} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
