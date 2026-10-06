// Errors server functions throw on purpose. The code tells the client what kind of failure
// it is without parsing messages; the key names the message, which the client shows in the
// user's language (src/lib/errors.ts). src/start.ts sends both to the client, so this file
// must stay importable from the browser: no server imports.
export type AppErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  // Input that passed the schema but breaks a rule that needs the database.
  | 'INVALID'

// Every message an AppError can carry, by key. Keys are stable and snake_case, and each
// has a Paraglide message error_<key> (src/lib/errors.ts); the English text is the fallback
// for a client built before a key existed.
export const errorMessages = {
  sign_in_required: 'Sign in first.',
  not_organization_member: 'You are not a member of this organization.',
  profile_not_found: 'Profile not found.',
  profile_left: 'This person has left the organization.',
  update_request_forbidden: 'Only admins can request profile updates.',
  update_request_open: 'This profile already has an open update request.',
  technology_forbidden: 'Only admins can change catalogue entries.',
  technology_name_invalid: 'The name needs at least one letter or digit.',
  technology_category_not_found: 'That category doesn’t exist.',
  technology_exists: 'That technology is already in the catalogue.',
  technology_not_found: 'Technology not found.',
  technology_merge_self: 'Choose another technology to merge into.',
  criterion_forbidden: 'Only admins can manage the technical characteristics.',
  criterion_not_found: 'Technical characteristic not found.',
  role_forbidden: 'Only admins can change roles.',
  role_name_invalid: 'The Estonian name needs at least one letter or digit.',
  role_exists: 'That role is already in the list.',
  role_not_found: 'Role not found.',
  role_merge_self: 'Choose another role to merge into.',
  project_not_found: 'Project not found.',
} as const

export type AppErrorKey = keyof typeof errorMessages

export class AppError extends Error {
  constructor(
    readonly code: AppErrorCode,
    readonly key: AppErrorKey,
  ) {
    super(errorMessages[key] ?? key)
    this.name = 'AppError'
  }
}
