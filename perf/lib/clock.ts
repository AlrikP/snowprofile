// Moves Date to DEMO_NOW and lets it run on from there, so "today" on the server and in the
// browser lands on the generated data, and both render the same. Only Date moves: timers
// and performance.now() stay real, so measurements aren't affected.
//
// The server loads this file with `bun --preload`; browsers get shiftDate as an init script
// through shiftBrowserClock.

import type { BrowserContext } from '@playwright/test'

// A stand-in constructor that makes real Dates and shares Date.prototype, so instanceof and
// `value.constructor === Date` checks (seroval's, in the router) hold for every instance.
function shiftDate(target: number) {
  const RealDate = Date
  const offset = target - RealDate.now()
  function now() {
    return RealDate.now() + offset
  }
  // oxlint-disable-next-line typescript/no-explicit-any -- Date's constructor overloads
  function ShiftedDate(this: unknown, ...args: any[]) {
    if (!new.target) return new RealDate(now()).toString()
    // @ts-expect-error -- forwards whichever overload the caller used
    return args.length === 0 ? new RealDate(now()) : new RealDate(...args)
  }
  ShiftedDate.prototype = RealDate.prototype
  ShiftedDate.now = now
  ShiftedDate.parse = RealDate.parse
  ShiftedDate.UTC = RealDate.UTC
  RealDate.prototype.constructor = ShiftedDate
  globalThis.Date = ShiftedDate as unknown as DateConstructor
}

export async function shiftBrowserClock(context: BrowserContext, target: Date) {
  await context.addInitScript(shiftDate, target.getTime())
}

// Loaded with --preload: PERF_NOW is the moment to move to, in milliseconds.
if (process.env.PERF_NOW && typeof window === 'undefined') {
  shiftDate(Number(process.env.PERF_NOW))
}
