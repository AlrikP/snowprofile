// Builds prototypes/build/ (prototypes/README.md): the CSS from the app's src/styles.css
// with the classes prototypes/ uses, the page script from prototypes/lib/, and the icons
// that prototypes/lib/icons.ts names, rendered to SVG. With --watch, the CSS and the
// script rebuild on change; the icons only on start.
//
// Usage: bun run prototypes:build [--watch]

import { mkdirSync, writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as icons from '../prototypes/lib/icons'

const out = 'prototypes/build'
const { values } = parseArgs({ options: { watch: { type: 'boolean', default: false } } })
const watch = values.watch ? ['--watch'] : []

mkdirSync(out, { recursive: true })
const svgs = Object.fromEntries(
  Object.entries(icons).map(([name, icon]) => [name, renderToStaticMarkup(createElement(icon))]),
)
writeFileSync(`${out}/icons.js`, `window.prototypeIcons = ${JSON.stringify(svgs)}\n`)

// Tailwind scans the folder it runs in, so only the prototypes' classes reach the CSS.
const css = Bun.spawn(
  [
    '../node_modules/.bin/tailwindcss',
    '-i',
    'prototype.css',
    '-o',
    'build/prototype.css',
    ...watch,
  ],
  { cwd: 'prototypes', stdio: ['inherit', 'inherit', 'inherit'] },
)
const script = Bun.spawn(
  [
    'bun',
    'build',
    'prototypes/lib/main.ts',
    '--outfile',
    `${out}/prototype.js`,
    '--format',
    'iife',
    ...watch,
  ],
  { stdio: ['inherit', 'inherit', 'inherit'] },
)

const codes = await Promise.all([css.exited, script.exited])
if (codes.some((code) => code !== 0)) process.exit(1)
