import * as v from 'valibot'

// Slugs the app's own top-level routes use: an organization there would be unreachable.
const RESERVED_SLUGS = ['api', 'invite', 'no-access', 'sign-in']

export const CreateOrganizationInput = v.object({
  // The organization's URL segment (/<slug>/projects): lowercase words joined by hyphens.
  slug: v.pipe(
    v.string(),
    v.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, digits, and hyphens.'),
    v.check((slug) => !RESERVED_SLUGS.includes(slug), 'That slug is one of the app’s routes.'),
  ),
  name: v.pipe(v.string(), v.trim(), v.nonEmpty('Give the organization a name.')),
  adminEmail: v.pipe(v.string(), v.trim(), v.toLowerCase(), v.email('Invalid email.')),
})
export type CreateOrganizationInput = v.InferOutput<typeof CreateOrganizationInput>
