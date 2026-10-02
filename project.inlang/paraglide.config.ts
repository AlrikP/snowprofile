import { defineConfig } from '@inlang/paraglide-js'

// Read by the Vite plugin and by `bun run i18n:compile`. The locale is in a cookie, not the
// URL (docs/architecture.md, "Stack"); without a cookie the browser's language decides, then
// Estonian.
export default defineConfig({
  outdir: './src/paraglide',
  strategy: ['cookie', 'preferredLanguage', 'baseLocale'],
  cookieMaxAge: 365 * 24 * 60 * 60,
})
