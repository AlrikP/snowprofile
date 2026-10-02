// Valibot building blocks shared by the domain schemas. This file and every *.schemas.ts
// must stay importable from the browser: no server imports.
import * as v from 'valibot'

// App-owned rows get their ID on the client, so optimistic updates keep a stable key
// (docs/architecture.md, "Types").
export const Uuidv7 = v.pipe(
  v.string(),
  v.regex(/^[\da-f]{8}-[\da-f]{4}-7[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i, 'Invalid ID.'),
)

// The organization a scoped call acts in. scopeMiddleware checks it on the call's whole
// input and passes the input on unchanged for the function's own schema; the server then
// checks that the caller is a member.
const OrganizationInput = v.object({ organizationId: v.pipe(v.string(), v.nonEmpty()) })

export function parseOrganizationInput<T extends { organizationId: string }>(input: T): T {
  v.parse(OrganizationInput, input)
  return input
}
