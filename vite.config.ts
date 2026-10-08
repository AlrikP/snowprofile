import { paraglideVitePlugin } from '@inlang/paraglide-js'
import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    // Options in project.inlang/paraglide.config.ts, shared with `bun run i18n:compile`.
    paraglideVitePlugin({ project: './project.inlang' }),
    nitro({ rollupConfig: { external: [/^@sentry\//] } }),
    tailwindcss(),
    tanstackStart({
      // src/server.ts is Start's default, which would sit beside the src/server/ folder.
      server: { entry: 'server-entry' },
      // The router's default leaves pendingComponent in the route, which the entry chunk
      // imports, and with it the whole page module. Grouped with component, a page and its
      // pending state load together, with the route.
      router: {
        codeSplittingOptions: {
          defaultBehavior: [
            ['component', 'pendingComponent'],
            ['errorComponent'],
            ['notFoundComponent'],
          ],
        },
      },
    }),
    viteReact(),
  ],
})

export default config
