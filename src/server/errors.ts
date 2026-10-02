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

// Every message an AppError can carry, by key. Keys are stable and snake_case, so task 010
// can name its messages error_<key>; the English text is the fallback for a client built
// before a key existed.
export const errorMessages = {
  sign_in_required: 'Sign in first.',
  not_organization_member: 'You are not a member of this organization.',
  profile_not_found: 'Profile not found.',
  profile_left: 'This person has left the organization.',
  update_request_forbidden: 'Only admins can request profile updates.',
  update_request_open: 'This profile already has an open update request.',
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
