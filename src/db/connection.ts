import { type Client, type Config, createClient, type Transaction } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { AsyncLocalStorage } from 'node:async_hooks'
import { relations } from './relations'

// How long a statement waits for another process's write lock (db:migrate, a seed, or the
// sqlite3 shell on the dev server's file) before failing with SQLITE_BUSY. After a
// SQLITE_BUSY, @libsql/client 0.18 can lose the connection's later writes, so waiting is
// what keeps them.
const BUSY_TIMEOUT_MS = 5000

// The client whose db.transaction callback is running, so the client can tell a statement
// from inside the transaction apart from one beside it.
const transactionOf = new AsyncLocalStorage<Client>()

export function openDatabase(url: string) {
  const client = openClient({ url })
  const db = drizzle({ client, relations })
  const transaction = db.transaction.bind(db)
  db.transaction = (run, config) =>
    transaction((tx) => transactionOf.run(client, () => run(tx)), config)
  return db
}

function openClient(config: Config): Client {
  return oneAtATime(createClient({ ...config, timeout: BUSY_TIMEOUT_MS }))
}

// The client opens a separate connection for each transaction. A write on the main
// connection while a transaction holds the lock would busy-wait, and the busy wait blocks
// the process, so the transaction can't commit: the write fails after BUSY_TIMEOUT_MS.
// Instead, statements wait their turn while a transaction is open. Code inside a
// transaction must use its handle, never the client, or it would wait for itself; the
// client throws instead.
function oneAtATime(client: Client): Client {
  let queue = Promise.resolve()

  // Resolves when the caller's turn comes, with the function that ends the turn.
  function turn(): Promise<() => void> {
    if (transactionOf.getStore() === proxy) {
      return Promise.reject(
        new Error('Used the database inside its own transaction; use the transaction handle.'),
      )
    }
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

  const proxy = new Proxy(client, {
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
  return proxy
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
