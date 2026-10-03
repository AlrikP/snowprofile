/// <reference types="bun" />

// Preloaded for bun test (bunfig.toml). Start's compiler turns `.handler(fn)` into
// `.handler(rpcStub, fn)`, and only the second argument runs on the server. Tests run
// uncompiled, so this does the same, and src/server/testing.ts's callServerFn reaches the
// handler.
import { mock } from 'bun:test'

const start = await import('@tanstack/react-start')

type Builder = (...args: unknown[]) => unknown

function compiled(builder: Builder): Builder {
  return new Proxy(builder, {
    get(target, key) {
      const value: unknown = Reflect.get(target, key)
      if (typeof value !== 'function') return value
      if (key === 'handler') return (fn: unknown) => value(fn, fn)
      if (key === 'middleware' || key === 'validator' || key === 'inputValidator') {
        return (...args: unknown[]) => compiled(value(...args) as Builder)
      }
      return value
    },
    apply(target, thisArg, args) {
      return compiled(Reflect.apply(target, thisArg, args) as Builder)
    },
  })
}

await mock.module('@tanstack/react-start', () => ({
  ...start,
  createServerFn: compiled(start.createServerFn as Builder),
}))
