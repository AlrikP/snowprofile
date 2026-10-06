// Creates an organization with its technology categories and invites its first admin, as
// the platform operator (docs/product.md, "Users and access"). Prints the invitation link,
// which the operator sends by hand. An existing slug is left as it is, so a re-run is safe.
//
// Usage: bun run org:create <slug> <name> <admin email>
//        bun run org:create snowhound "Snowhound OÜ" admin@snowhound.eu

import * as v from 'valibot'
import type { Database } from '#/db'
import { SYSTEM_USER_ID, withActor } from '#/db/actor'
import { openDatabase } from '#/db/connection'
import { env } from '#/env'
import { INVITATION_DAYS } from '#/server/invitations/invitations.server'
import { CreateOrganizationInput } from '#/server/organizations/organizations.schemas'
import { createOrganization } from '#/server/organizations/organizations.server'

// What the run printed, and whether it succeeded.
export async function orgCreate(
  db: Database,
  args: string[],
  baseUrl: string,
): Promise<{ ok: boolean; message: string }> {
  if (args.length !== 3) {
    return { ok: false, message: 'Usage: bun run org:create <slug> <name> <admin email>' }
  }
  const [slug, name, adminEmail] = args
  const input = v.safeParse(CreateOrganizationInput, { slug, name, adminEmail })
  if (!input.success) {
    return { ok: false, message: input.issues.map((issue) => issue.message).join(' ') }
  }
  const result = await withActor(SYSTEM_USER_ID, () => createOrganization(db, input.output))
  if (!result.created) {
    return { ok: true, message: `${input.output.slug} already exists; nothing changed.` }
  }
  const link = new URL(`/invite/${result.invitationId}`, baseUrl).href
  return {
    ok: true,
    message: [
      `Created ${input.output.name} at /${input.output.slug}.`,
      `Send ${input.output.adminEmail} this invitation, valid for ${INVITATION_DAYS} days:`,
      link,
    ].join('\n'),
  }
}

if (import.meta.main) {
  const { ok, message } = await orgCreate(
    openDatabase(env.DATABASE_URL),
    process.argv.slice(2),
    env.BETTER_AUTH_URL,
  )
  for (const line of message.split('\n')) (ok ? console.log : console.error)(`[org-create] ${line}`)
  if (!ok) process.exit(1)
}
