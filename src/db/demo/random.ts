import { v7 as uuidv7 } from 'uuid'

// FNV-1a, to turn a seed and a key (an organization's slug) into a 32-bit state.
function hash(text: string) {
  let state = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    state ^= text.charCodeAt(i)
    state = Math.imul(state, 0x01000193)
  }
  return state >>> 0
}

// A seeded random stream (mulberry32): the same seed and key always give the same values.
export function createRandom(seed: number, key: string) {
  let state = hash(`${seed}:${key}`)

  function next() {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  // A whole number from min to max, both included.
  function int(min: number, max: number) {
    return min + Math.floor(next() * (max - min + 1))
  }

  function chance(probability: number) {
    return next() < probability
  }

  function pick<T>(items: readonly T[]): T {
    const item = items[int(0, items.length - 1)]
    if (item === undefined) throw new Error('pick() from an empty list')
    return item
  }

  // count distinct items, in random order.
  function sample<T>(items: readonly T[], count: number): T[] {
    const pool = [...items]
    const picked: T[] = []
    while (picked.length < count && pool.length > 0) {
      picked.push(...pool.splice(int(0, pool.length - 1), 1))
    }
    return picked
  }

  // A UUIDv7 at the given time, with random bits from this stream.
  function uuid(at: Date) {
    const bytes = new Uint8Array(16)
    for (let i = 0; i < bytes.length; i++) bytes[i] = int(0, 255)
    return uuidv7({ msecs: at.getTime(), random: bytes })
  }

  return { next, int, chance, pick, sample, uuid }
}
