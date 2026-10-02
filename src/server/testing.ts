// What a call rejected with, or null when it resolved: tests then match the AppError's
// code and key.
export function rejection(run: Promise<unknown>): Promise<unknown> {
  return run.then(
    () => null,
    (reason: unknown) => reason,
  )
}
