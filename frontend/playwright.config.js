import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',

  fullyParallel: false,
  workers: 1,

  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,

  reporter: 'html',

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  timeout: 60000,
  expect: {
    timeout: 15000,
  },

  projects: [
    // 1st — seeds inventory items with stock into the DB
    {
      name: 'inventory',
      testMatch: '**/inventory.spec.js',
      use: { ...devices['Desktop Chrome'] },
    },
    // 2nd — needs inventory items to create a JO
    {
      name: 'admin',
      testMatch: '**/admin.spec.js',
      dependencies: ['inventory'],
      use: { ...devices['Desktop Chrome'] },
    },
    // 3rd — chain and technician need JOs to exist
    {
      name: 'chain-technician',
      testMatch: ['**/chain.spec.js', '**/technician.spec.js'],
      dependencies: ['admin'],
      use: { ...devices['Desktop Chrome'] },
    },
    // 4th — pdf needs a JO; auth can run anytime but runs last to be safe
    {
      name: 'others',
      testMatch: ['**/auth.spec.js', '**/pdf.spec.js'],
      dependencies: ['chain-technician'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})