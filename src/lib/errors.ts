import { m } from '#/paraglide/messages.js'
import { AppError, type AppErrorKey } from '#/server/errors'

// One message per AppError key. Typed as a full record, so a key added to the catalog in
// src/server/errors.ts fails the type check until it has a message here.
const errorText: Record<AppErrorKey, () => string> = {
  sign_in_required: m.error_sign_in_required,
  not_organization_member: m.error_not_organization_member,
  profile_not_found: m.error_profile_not_found,
  profile_left: m.error_profile_left,
  update_request_forbidden: m.error_update_request_forbidden,
  update_request_open: m.error_update_request_open,
  technology_forbidden: m.error_technology_forbidden,
  technology_name_invalid: m.error_technology_name_invalid,
  technology_category_not_found: m.error_technology_category_not_found,
  technology_exists: m.error_technology_exists,
  technology_not_found: m.error_technology_not_found,
  technology_merge_self: m.error_technology_merge_self,
  criterion_forbidden: m.error_criterion_forbidden,
  criterion_not_found: m.error_criterion_not_found,
  role_forbidden: m.error_role_forbidden,
  role_name_invalid: m.error_role_name_invalid,
  role_exists: m.error_role_exists,
  role_not_found: m.error_role_not_found,
  role_merge_self: m.error_role_merge_self,
}

// The text to show for an error from a server function. Server functions send codes and
// keys, never text (AGENTS.md, "Code conventions"); the client picks the message in the
// user's language. An AppError from a newer server than this client falls back to the
// server's English message; anything else is unexpected and gets a generic message instead
// of internals.
export function errorMessage(error: unknown): string {
  if (error instanceof AppError) return errorText[error.key]?.() ?? error.message
  return m.error_unexpected()
}
