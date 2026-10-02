import { type Client, type Config, createClient, type Transaction } from '@libsql/client'

// How long a statement waits for another process's write lock (db:migrate, a seed, or the
// sqlite3 shell on the dev server's file) before failing with SQLITE_BUSY. After a
// SQLITE_BUSY, @libsql/client 0.18 can lose the connection's later writes, so waiting is
// what keeps them.
const BUSY_TIMEOUT_MS = 5000

export function openClient(config: Config): Client {
  return oneAtATime(createClient({ ...config, timeout: BUSY_TIMEOUT_MS }))
}

// The client opens a separate connection for each transaction. A write on the main
// connection while a transaction holds the lock would busy-wait, and the busy wait blocks
// the process, so the transaction can't commit: the write fails after BUSY_TIMEOUT_MS.
// Instead, statements wait their turn while a transaction is open. Code inside a
// transaction must use its handle, never the client, or it waits for itself.
function oneAtATime(client: Client): Client {
  let queue = Promise.resolve()

  // Resolves when the caller's turn comes, with the function that ends the turn.
  function turn(): Promise<() => void> {
    let end!: () => void
    const ended = new Promise<void>((resolve) => (end = resolve))
    const started = queue.then(() => end)
    queue = queue.then(() => ended)
    return started
  }

  async function inTurn<T>(run: () => Promise<T>): Promise<T> {
    const end = await turn()
    try {
      return await run()
    } finally {
      end()
    }
  }

  return new Proxy(client, {
    get(target, key) {
      const value: unknown = Reflect.get(target, key, target)
      if (typeof value !== 'function') return value
      if (key === 'transaction') {
        return async (...args: Parameters<Client['transaction']>) => {
          const end = await turn()
          try {
            return endingOnClose(await target.transaction(...args), end)
          } catch (error) {
            end()
            throw error
          }
        }
      }
      if (key === 'execute' || key === 'batch' || key === 'migrate' || key === 'executeMultiple') {
        return (...args: unknown[]) => inTurn(() => value.apply(target, args))
      }
      return value.bind(target)
    },
  })
}

// A transaction's turn lasts until it commits, rolls back, or closes.
function endingOnClose(transaction: Transaction, end: () => void): Transaction {
  return new Proxy(transaction, {
    get(target, key) {
      const value: unknown = Reflect.get(target, key, target)
      if (typeof value !== 'function') return value
      if (key !== 'commit' && key !== 'rollback' && key !== 'close') return value.bind(target)
      return async (...args: unknown[]) => {
        try {
          return await value.apply(target, args)
        } finally {
          if (target.closed) end()
        }
      }
    },
  })
}
