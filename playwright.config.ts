import { defineConfig, devices } from '@playwright/test'
import { E2E_PORT } from './e2e/server'

// End-to-end tests against the production build (e2e/server.ts). The setup project signs
// in each seeded role once and saves the session; later tests reuse it.
export default defineConfig({
  testDir: 'e2e',
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${E2E_PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /\.setup\.ts$/ },
    {
      name: 'chromium',
      testMatch: /\.e2e\.ts$/,
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'bun run build && bun e2e/server.ts',
    url: `http://localhost:${E2E_PORT}/sign-in`,
    // Always a fresh server, so every run starts from the same seeded data.
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
