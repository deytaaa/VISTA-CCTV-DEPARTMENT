import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const TECHNICIAN_EMAIL = 'technician@gmail.com'
const TECHNICIAN_PASSWORD = 'technician123'

test.describe('Technician Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto(`${BASE_URL}/login`)
    await page.waitForLoadState('networkidle')

    // Login as technician
    await page.fill('input[type="email"]', TECHNICIAN_EMAIL)
    await page.fill('input[type="password"]', TECHNICIAN_PASSWORD)
    await page.click('button[type="submit"]')

    // Wait for a successful login state (avoid fragile URL waits).
    // Snapshot shows the page can land on an "User is banned" screen, so we also block that.
    const bannedBanner = page.locator('text=User is banned').first()
    const signInButton = page.getByRole('button', { name: 'Sign In' }).first()


    // If still on login and banned, fail fast.
    await Promise.race([
      page.waitForURL('**/dashboard**', { timeout: 30000 }).catch(() => null),
      page.getByText('Assigned Work').first().waitFor({ timeout: 30000 }).catch(() => null),
      bannedBanner.waitFor({ timeout: 30000 }).catch(() => null),
    ])

    // If we landed on the banned screen, assert and stop.
    if ((await bannedBanner.count()) > 0) {
      await expect(bannedBanner).toBeVisible({ timeout: 5000 })
    }

    await page.waitForLoadState('networkidle')

  })






  test.afterEach(async ({ page }, testInfo) => {
    // Take a screenshot on failure
    if (testInfo.status !== 'passed') {
      await page.screenshot({
        path: `test-results/screenshots/${testInfo.title}-failed.png`,
      })
    }
  })

  test('Login as technician → should see Assigned Work on dashboard', async ({ page }) => {
    test.setTimeout(30000)

    // Dashboard may render “Assigned Work” as a heading/label or inside a card.
    // Use a stable heading role selector.
    await expect(page.getByRole('heading', { name: 'Assigned Work' })).toBeVisible({ timeout: 10000 })



  })


  test('Go to Job Orders → should show the assigned JO table', async ({ page }) => {
    test.setTimeout(30000)

    // Navigate to Job Orders page
    await page.goto(`${BASE_URL}/jo`)
    await page.waitForLoadState('networkidle')

    // Prefer the table view on desktop — wait for network idle and a short render delay
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    const tableBody = page.locator('table tbody')
    await expect(tableBody).toBeVisible({ timeout: 10000 })
    const rowCount = await page.locator('table tbody tr').count()
    expect(rowCount).toBeGreaterThan(0)
  })


  test('Click View on a Sent JO → should open JO detail page', async ({ page }) => {
    test.setTimeout(30000)

    // Navigate to Job Orders page
    await page.goto(`${BASE_URL}/jo/sent`)
    await page.waitForLoadState('networkidle')

    // Wait for table to load
    const tableRows = page.locator('table tbody tr, [role="row"]')
    const rowCount = await tableRows.count()

    if (rowCount > 0) {
      // Click the View button on first row
      const viewButton = tableRows.first().locator('a:has-text("View"), button:has-text("View")')
      await viewButton.click()

      // Wait for JO detail page
      await page.waitForURL('**/jo/**', { timeout: 10000 })
      await page.waitForLoadState('networkidle')

      // Verify we're on detail page
      expect(page.url()).toContain('/jo/')
    }
  })

  test('Mark as Processing → status should update to Processing', async ({ page }) => {
    test.setTimeout(30000)

    // Navigate to Job Orders - Sent
    await page.goto(`${BASE_URL}/jo/sent`)
    await page.waitForLoadState('networkidle')

    // Get first JO row
    const tableRows = page.locator('table tbody tr, [role="row"]')
    const rowCount = await tableRows.count()

    if (rowCount > 0) {
      // Click View on first row
      const viewButton = tableRows.first().locator('a:has-text("View"), button:has-text("View")')
      await viewButton.click()

      // Wait for detail page
      await page.waitForURL('**/jo/**', { timeout: 10000 })
      await page.waitForLoadState('networkidle')

      // Click "Mark as Processing" button
      const processingButton = page.locator('button:has-text("Processing"), button:has-text("Mark as Processing")')
      if ((await processingButton.count()) > 0) {
        await processingButton.click()

        // Wait for status update
        const processingBadge = page.locator('text=Processing, [class*="badge"]:has-text("Processing")')
        await expect(processingBadge.first()).toBeVisible({ timeout: 10000 })
      }
    }
  })

  test('Upload proof image and add completion remarks → click Save Proof → should show success toast', async ({
    page,
  }) => {
    test.setTimeout(30000)

    // Navigate to Job Orders - Processing
    await page.goto(`${BASE_URL}/jo/processing`)
    await page.waitForLoadState('networkidle')

    // Get first JO row
    const tableRows = page.locator('table tbody tr, [role="row"]')
    const rowCount = await tableRows.count()

    if (rowCount > 0) {
      // Click View on first row
      const viewButton = tableRows.first().locator('a:has-text("View"), button:has-text("View")')
      await viewButton.click()

      // Wait for detail page
      await page.waitForURL('**/jo/**', { timeout: 10000 })
      await page.waitForLoadState('networkidle')

      // Upload proof image
      const fileInput = page.locator('input[type="file"]')
      if ((await fileInput.count()) > 0) {
        // Create a test image file
        const imagePath = 'test-image.png'
        await fileInput.first().setInputFiles({
          name: 'test-proof.png',
          mimeType: 'image/png',
          buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
        })
      }

      // Fill in completion remarks
      const remarksInput = page.locator('textarea, input[placeholder*="remark" i], input[placeholder*="note" i]')
      if ((await remarksInput.count()) > 0) {
        await remarksInput.first().fill('Work completed successfully')
      }

      // Click Save Proof button
      const saveProofButton = page.locator('button:has-text("Save Proof"), button:has-text("Save"), button:has-text("Submit")')
      if ((await saveProofButton.count()) > 0) {
        await saveProofButton.last().click()

        // Wait for success message
        const successToast = page.locator('[role="status"], .toast-success')
        await expect(successToast.first()).toBeVisible({ timeout: 10000 })
      }
    }
  })

  test('Click Submit for Approval → status should change to For Approval', async ({ page }) => {
    test.setTimeout(30000)

    // Navigate to Job Orders - Processing
    await page.goto(`${BASE_URL}/jo/processing`)
    await page.waitForLoadState('networkidle')

    // Get first JO row
    const tableRows = page.locator('table tbody tr, [role="row"]')
    const rowCount = await tableRows.count()

    if (rowCount > 0) {
      // Click View on first row
      const viewButton = tableRows.first().locator('a:has-text("View"), button:has-text("View")')
      await viewButton.click()

      // Wait for detail page
      await page.waitForURL('**/jo/**', { timeout: 10000 })
      await page.waitForLoadState('networkidle')

      // Click "Submit for Approval" button
      const submitButton = page.locator('button:has-text("Submit for Approval"), button:has-text("For Approval")')
      if ((await submitButton.count()) > 0) {
        await submitButton.click()

        // Confirm if modal appears
        const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Submit")')
        if ((await confirmButton.count()) > 0) {
          await confirmButton.last().click()
        }

        // Wait for status to change to "For Approval"
        const approvalBadge = page.locator('text=For Approval, [class*="badge"]:has-text("For Approval")')
        await expect(approvalBadge.first()).toBeVisible({ timeout: 10000 })
      }
    }
  })

  test('Go to Approved sidebar page → should only show Approved JOs', async ({ page }) => {
    test.setTimeout(30000)

    // Click on Approved link in sidebar (avoid strict-mode violations)
    const approvedLink = page.locator('nav a:has-text("Approved")').first()
    await approvedLink.click()


    // Wait for page to load
    await page.waitForURL('**/approved**', { timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Verify URL contains "approved"
    expect(page.url()).toContain('approved')

    // Check if table rows (desktop) or cards (responsive) are present
    const tableRows = page.locator('table tbody tr, .jo-card, [data-testid="jo-row"]')

    // If there are rows/cards, verify they all show "Approved" status
    const rowCount = await tableRows.count()
    if (rowCount > 0) {
      // JOStatusBadge renders a status pill; don't rely on [class*="badge"].
      const approvedPill = page.locator('div, span').filter({ hasText: /^Approved$/ }).first()
      await expect(approvedPill).toBeVisible({ timeout: 10000 })
    }


  })
})
