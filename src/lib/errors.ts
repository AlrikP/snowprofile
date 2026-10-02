import { AppError, errorMessages } from '#/server/errors'

// The text to show for an error from a server function. Server functions send codes and
// keys, never text (AGENTS.md, "Code conventions"); the client picks the message by key.
// Until the UI has translations, the messages are the English catalog. Anything that isn't
// an AppError is unexpected and gets a generic message instead of internals.
export function errorMessage(error: unknown): string {
  if (error instanceof AppError) return errorMessages[error.key] ?? error.message
  return 'Something went wrong. Try again.'
}
