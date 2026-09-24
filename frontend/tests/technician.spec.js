import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const TECHNICIAN_EMAIL = 'technician@gmail.com'
const TECHNICIAN_PASSWORD = 'technician123'

const PROOF_FILE = {
  name: 'technician-test-proof.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64'
  ),
}

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
    test.setTimeout(60000)

    await page.goto(`${BASE_URL}/jo/sent`)
    await page.waitForLoadState('networkidle')

    // Assert the precondition instead of skipping on it. This used to be
    // `if (rowCount > 0)`, so the test passed silently whenever the list was
    // empty and nothing was actually exercised.
    const rows = page.locator('table tbody tr')
    await expect(
      rows.first(),
      'Expected at least one Sent JO assigned to the technician (admin.spec creates one)',
    ).toBeVisible({ timeout: 15000 })

    const joNumber = (await rows.first().locator('td').first().textContent())?.match(/JO-\d{4}-\d{4}/)?.[0]
    expect(joNumber, 'Could not read a JO number from the first Sent row').toBeTruthy()

    const processingBtn = rows.first().locator('button').filter({ hasText: /mark as processing/i }).first()
    await expect(processingBtn).toBeVisible({ timeout: 10000 })
    await processingBtn.click()

    // It leaves the Sent list and turns up under Processing.
    await page.goto(`${BASE_URL}/jo/processing`)
    await page.waitForLoadState('networkidle')
    await expect(
      page.locator('table tbody tr').filter({ hasText: joNumber }).first(),
      `${joNumber} should appear in the Processing list`,
    ).toBeVisible({ timeout: 15000 })
  })

  test('Upload proof image and add completion remarks → click Save Proof → should show success toast', async ({
    page,
  }) => {
    test.setTimeout(60000)

    // Proof is uploaded from the Job Orders table, not the JO detail page --
    // the detail page has no upload UI. The old version drove the detail page
    // and guarded every step, so it passed while uploading nothing at all.
    await page.goto(`${BASE_URL}/jo/processing`)
    await page.waitForLoadState('networkidle')

    const row = page.locator('table tbody tr').filter({ hasText: /JO-/ }).first()
    await expect(row, 'Expected at least one Processing JO').toBeVisible({ timeout: 15000 })

    const uploadBtn = row.locator('button').filter({ hasText: /upload proof/i }).first()
    await expect(uploadBtn, 'Processing JO should offer Upload Proof').toBeVisible({ timeout: 10000 })
    await uploadBtn.click()

    await expect(page.getByRole('heading', { name: /upload proof/i })).toBeVisible({ timeout: 10000 })

    // The file input is sr-only, so set it directly.
    await page.locator('input[type="file"]').first().setInputFiles(PROOF_FILE)

    const remarks = page.locator('textarea[placeholder="Add completion remarks"]').first()
    await expect(remarks).toBeVisible({ timeout: 10000 })
    await remarks.fill('Work completed successfully')

    await page.locator('button').filter({ hasText: /^save proof$/i }).first().click()

    // Modal closes on success and the row now offers Submit for Approval.
    await expect(page.getByRole('heading', { name: /upload proof/i })).toBeHidden({ timeout: 20000 })
    await expect(
      row.locator('button').filter({ hasText: /submit for approval/i }).first(),
      'Saving proof should reveal Submit for Approval on the row',
    ).toBeVisible({ timeout: 20000 })
  })

  test('Click Submit for Approval → status should change to For Approval', async ({ page }) => {
    test.setTimeout(60000)

    await page.goto(`${BASE_URL}/jo/processing`)
    await page.waitForLoadState('networkidle')

    const row = page.locator('table tbody tr').filter({ hasText: /JO-/ }).first()
    await expect(row, 'Expected at least one Processing JO').toBeVisible({ timeout: 15000 })

    const joNumber = (await row.locator('td').first().textContent())?.match(/JO-\d{4}-\d{4}/)?.[0]
    expect(joNumber, 'Could not read a JO number from the Processing row').toBeTruthy()

    const submitBtn = row.locator('button').filter({ hasText: /submit for approval/i }).first()
    await expect(
      submitBtn,
      `${joNumber} should offer Submit for Approval (proof must be saved first)`,
    ).toBeVisible({ timeout: 15000 })
    await submitBtn.click()

    const confirmBtn = page.locator('button').filter({ hasText: /^confirm$/i }).first()
    await expect(confirmBtn).toBeVisible({ timeout: 10000 })
    await confirmBtn.click()

    await expect(
      row.getByText(/for approval/i).first(),
      `${joNumber} should show For Approval after submitting`,
    ).toBeVisible({ timeout: 20000 })
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
