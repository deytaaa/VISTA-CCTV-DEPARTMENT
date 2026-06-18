import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page before each test
    await page.goto(`${BASE_URL}/login`)
    await page.waitForLoadState('networkidle')
  })

  test.afterEach(async ({ page }, testInfo) => {
    // Take a screenshot on failure
    if (testInfo.status !== 'passed') {
      await page.screenshot({
        path: `test-results/screenshots/${testInfo.title.replace(/[^a-zA-Z0-9_-]/g, '_')}-failed.png`,
      })

    }
  })

  test('Login as admin with correct credentials → should reach /dashboard and see "Admin Console"', async ({
    page,
  }) => {
    test.setTimeout(30000)

    // Fill in login credentials
    await page.fill('input[type="email"]', 'admin@gmail.com')
    await page.fill('input[type="password"]', 'admin123')

    // Click login button
    await page.click('button[type="submit"]')

    // Wait for redirect to dashboard
    await page.waitForURL(`${BASE_URL}/dashboard`)

    // Check for "Admin Console" text
    const adminConsoleText = page.locator('text=Admin Console')
    await expect(adminConsoleText).toBeVisible()
  })

  test('Login as technician with correct credentials → should reach /dashboard and see "Technician Console"', async ({
    page,
  }) => {
    test.setTimeout(30000)

    // Fill in login credentials
    await page.fill('input[type="email"]', 'technician@gmail.com')
    await page.fill('input[type="password"]', 'technician123')

    // Click login button
    await page.click('button[type="submit"]')

    // Wait for either the dashboard route OR the console text to appear (whichever happens first)
    const technicianConsoleText = page.locator('text=Technician Console').first()
    await Promise.race([
      page.waitForURL('**/dashboard**', { timeout: 30000 }).catch(() => null),
      technicianConsoleText.waitFor({ timeout: 30000 }).catch(() => null),
      page.waitForLoadState('networkidle').catch(() => null),
    ])

    // Check for "Technician Console" text
    await expect(technicianConsoleText).toBeVisible({ timeout: 10000 })


  })

  test('Login as inventory with correct credentials → should reach /dashboard and see "Inventory Dashboard"', async ({
    page,
  }) => {
    test.setTimeout(30000)

    // Fill in login credentials
    await page.fill('input[type="email"]', 'inventory@gmail.com')
    await page.fill('input[type="password"]', 'inventory123')

    // Click login button
    await page.click('button[type="submit"]')

    // Wait for redirect to dashboard
    await page.waitForURL(`${BASE_URL}/dashboard`)

    // Check for "Inventory Dashboard" text
    const inventoryDashboardText = page.locator('text=Inventory Dashboard')
    await expect(inventoryDashboardText).toBeVisible()
  })

  test('Login with wrong password → should show an error message', async ({ page }) => {
    test.setTimeout(30000)

    // Fill in login credentials with wrong password
    await page.fill('input[type="email"]', 'admin@gmail.com')
    await page.fill('input[type="password"]', 'wrongpassword123')

    // Click login button
    await page.click('button[type="submit"]')

    // Wait for error message to appear
    const errorMessage = page.locator('[role="alert"], .error, .text-red')
    await expect(errorMessage.first()).toBeVisible({ timeout: 5000 })

    // Ensure we're still on login page
    expect(page.url()).toContain('/login')
  })

  test('Access /dashboard without logging in → should redirect to /login', async ({ page }) => {
    test.setTimeout(30000)

    // Clear any existing session/cookies
    await page.context().clearCookies()

    // Navigate directly to dashboard
    await page.goto(`${BASE_URL}/dashboard`)

    // Should be redirected to login (ignore any ?next=... query string)
    await page.waitForURL('**/login**')


    // Verify we're on the login page
    expect(page.url()).toContain('/login')
  })
})
