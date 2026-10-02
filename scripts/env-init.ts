// Creates .env.local from .env.example and fills in a generated BETTER_AUTH_SECRET. A secret
// that is already set stays, so running it again doesn't sign everyone out. A script rather
// than a shell one-liner, so setup reads the same in cmd, PowerShell, and bash.
//
// Usage: bun run env:init

import { randomBytes } from 'node:crypto'
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'

const file = '.env.local'

if (!existsSync(file)) {
  copyFileSync('.env.example', file)
  console.log(`Created ${file} from .env.example.`)
}

const current = readFileSync(file, 'utf8')
const secret = randomBytes(32).toString('base64url')

if (/^BETTER_AUTH_SECRET=\S/m.test(current)) {
  console.log(`${file} already sets BETTER_AUTH_SECRET.`)
} else if (/^BETTER_AUTH_SECRET=[ \t]*$/m.test(current)) {
  writeFileSync(
    file,
    current.replace(/^BETTER_AUTH_SECRET=[ \t]*$/m, `BETTER_AUTH_SECRET=${secret}`),
  )
  console.log(`Generated BETTER_AUTH_SECRET in ${file}.`)
} else {
  const separator = current === '' || current.endsWith('\n') ? '' : '\n'
  writeFileSync(file, `${current}${separator}BETTER_AUTH_SECRET=${secret}\n`)
  console.log(`Added BETTER_AUTH_SECRET to ${file}.`)
}
