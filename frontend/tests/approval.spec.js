import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const ADMIN_EMAIL = 'admin@gmail.com'
const ADMIN_PASSWORD = 'admin123'
const TECHNICIAN_EMAIL = 'technician@gmail.com'
const TECHNICIAN_PASSWORD = 'technician123'

const PROOF_FILE = {
  name: 'approval-test-proof.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64'
  ),
}

async function loginAs(page, email, password) {
  await page.goto(`${BASE_URL}/login`)
  await page.waitForLoadState('networkidle')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard**', { timeout: 30000 })
  await page.waitForLoadState('networkidle')
}

async function createJOAndSubmitForApproval(browser) {
  // Admin creates JO
  const adminCtx = await browser.newContext()
  const adminPage = await adminCtx.newPage()
  await loginAs(adminPage, ADMIN_EMAIL, ADMIN_PASSWORD)

  await adminPage.goto(`${BASE_URL}/jo/create`)
  await adminPage.waitForLoadState('networkidle')
  await adminPage.waitForTimeout(2000)

  await adminPage.fill('input[placeholder*="location" i]', `Approval Test Site ${Date.now()}`)

  const dateInput = adminPage.locator('input[type="date"]')
  if ((await dateInput.count()) > 0) {
    await dateInput.first().fill(new Date().toISOString().split('T')[0])
  }

  // Wait for technician dropdown
  const allSelects = adminPage.locator('select')
  let techSelect = null
  for (let i = 0; i < 10; i++) {
    const count = await allSelects.count()
    for (let j = 0; j < count; j++) {
      const sel = allSelects.nth(j)
      const opts = await sel.locator('option').count()
      const firstOpt = await sel.locator('option').first().textContent().catch(() => '')
      if (opts > 1 && /technician|select a tech/i.test(firstOpt)) { techSelect = sel; break }
    }
    if (techSelect) break
    await adminPage.waitForTimeout(1000)
  }
  if (techSelect) { await techSelect.selectOption({ index: 1 }); await adminPage.waitForTimeout(500) }

  // Select inventory item
  const selCount = await allSelects.count()
  for (let i = 0; i < selCount; i++) {
    const sel = allSelects.nth(i)
    const firstOpt = await sel.locator('option').first().textContent().catch(() => '')
    if (/select item|item/i.test(firstOpt)) {
      const opts = await sel.locator('option').count()
      if (opts > 1) {
        await sel.selectOption({ index: 1 })
        await adminPage.waitForTimeout(1500)
        const proceedBtn = adminPage.locator('button').filter({ hasText: /proceed anyway/i }).first()
        if (await proceedBtn.isVisible({ timeout: 2000 }).catch(() => false)) await proceedBtn.click()
        const qtyInput = adminPage.locator('input[type="number"]').first()
        if ((await qtyInput.count()) > 0) await qtyInput.fill('1')
      }
      break
    }
  }

  // Personnel is required by both the form and the API — without at least one
  // named person the Generate JO click is rejected client-side and no JO is
  // ever created.
  const personnelNameInput = adminPage.locator('input[placeholder="Enter person name"]').first()
  await expect(personnelNameInput).toBeVisible({ timeout: 10000 })
  await personnelNameInput.fill('Approval Test Technician')

  await adminPage.click('button:has-text("Generate JO")')
  await adminPage.waitForLoadState('networkidle')
  await adminPage.waitForTimeout(2000)

  // Surface a form-level validation error rather than letting it look like a
  // mysterious missing-button failure much later in the flow.
  const formError = await adminPage
    .locator('text=/please (add|select|assign)|is required/i')
    .first()
    .textContent({ timeout: 2000 })
    .catch(() => null)

  const pageText = await adminPage.textContent('body').catch(() => '')
  const match = pageText.match(/JO-\d{4}-\d{4}/)
  const joNumber = match ? match[0] : null

  // Deliberately no fallback to "first JO in the list": that silently adopted
  // an unrelated existing JO and every later assertion then failed for the
  // wrong reason.
  expect(
    joNumber,
    `Setup failed to create a job order.${formError ? ` Form error: ${formError.trim()}` : ''}`,
  ).toBeTruthy()

  console.log('[setup] Created JO:', joNumber)
  await adminCtx.close()

  // Technician marks Processing + uploads proof + submits
  const techCtx = await browser.newContext()
  const techPage = await techCtx.newPage()
  await loginAs(techPage, TECHNICIAN_EMAIL, TECHNICIAN_PASSWORD)

  await techPage.goto(`${BASE_URL}/jo`)
  await techPage.waitForLoadState('networkidle')
  await techPage.waitForTimeout(2000)

  // The whole technician flow runs from the Job Orders table. The JO detail
  // page deliberately has no proof upload UI ("technicians upload from the
  // table only" — pages/jo/[id]/index.js), so driving it from the detail page
  // silently uploaded nothing and left the JO stuck in Processing.
  const joRow = techPage.locator('table tbody tr').filter({ hasText: joNumber }).first()
  await expect(joRow, `Technician should see ${joNumber} in their Job Orders list`).toBeVisible({ timeout: 15000 })

  // 1. Sent -> Processing
  const processingBtn = joRow.locator('button').filter({ hasText: /mark as processing/i }).first()
  await expect(processingBtn, `${joNumber} should offer Mark as Processing`).toBeVisible({ timeout: 10000 })
  await processingBtn.click()
  await expect(joRow.locator('button').filter({ hasText: /upload proof/i }).first()).toBeVisible({ timeout: 15000 })

  // 2. Upload proof through the row's modal
  await joRow.locator('button').filter({ hasText: /upload proof/i }).first().click()

  await expect(techPage.getByRole('heading', { name: /upload proof/i })).toBeVisible({ timeout: 10000 })

  // The file input is visually hidden (sr-only), so set it directly.
  await techPage.locator('input[type="file"]').first().setInputFiles(PROOF_FILE)

  const remarksInput = techPage.locator('textarea[placeholder="Add completion remarks"]').first()
  await expect(remarksInput).toBeVisible({ timeout: 10000 })
  await remarksInput.fill('Approval test — work completed.')

  await techPage.locator('button').filter({ hasText: /^save proof$/i }).first().click()

  // Modal closes and the row flips to showing Submit for Approval
  await expect(techPage.getByRole('heading', { name: /upload proof/i })).toBeHidden({ timeout: 20000 })

  // 3. Submit for approval
  const submitBtn = joRow.locator('button').filter({ hasText: /submit for approval/i }).first()
  await expect(submitBtn, `${joNumber} should offer Submit for Approval once proof is saved`).toBeVisible({ timeout: 20000 })
  await submitBtn.click()

  const confirmBtn = techPage.locator('button').filter({ hasText: /^confirm$/i }).first()
  await expect(confirmBtn).toBeVisible({ timeout: 10000 })
  await confirmBtn.click()

  await expect(joRow.getByText(/for approval/i).first()).toBeVisible({ timeout: 20000 })
  console.log('[setup] JO submitted for approval:', joNumber)
  await techCtx.close()

  return joNumber
}

test.describe('Admin Approval Flow', () => {
  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
      await page.screenshot({
        path: `test-results/screenshots/${testInfo.title.replace(/[^a-zA-Z0-9_-]/g, '_')}-failed.png`,
        fullPage: true,
      })
    }
  })

  test('Approval Queue → View Proof → should show uploaded proof', async ({ page, browser }) => {
    test.setTimeout(120000)

    const joNumber = await createJOAndSubmitForApproval(browser)
    expect(joNumber).toBeTruthy()

    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD)
    await page.goto(`${BASE_URL}/jo/approval`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    const joRow = page.locator('table tbody tr').filter({ hasText: joNumber }).first()
    await expect(joRow).toBeVisible({ timeout: 15000 })

    // Click View Proof
    const viewProofBtn = joRow.locator('button, a').filter({ hasText: /view proof/i }).first()
    await expect(viewProofBtn).toBeVisible({ timeout: 10000 })
    await viewProofBtn.click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // Proof should appear as image, modal, or link
    const proofImage = page.locator('img').first()
    const proofModal = page.locator('[class*="modal"], [class*="Modal"], [role="dialog"]').first()
    const proofLink = page.locator('a[href*="proof"], a[href*="storage"], a[href*="supabase"]').first()

    const imageVisible = await proofImage.isVisible({ timeout: 5000 }).catch(() => false)
    const modalVisible = await proofModal.isVisible({ timeout: 3000 }).catch(() => false)
    const linkVisible = await proofLink.isVisible({ timeout: 3000 }).catch(() => false)

    expect(imageVisible || modalVisible || linkVisible,
      'Proof image, modal, or link should be visible after clicking View Proof'
    ).toBeTruthy()
    console.log(`Confirmed View Proof works for JO ${joNumber}. ✅`)
  })

  test('Approval Queue → Approve a JO → status changes to Approved and appears in Archive', async ({ page, browser }) => {
    test.setTimeout(120000)

    const joNumber = await createJOAndSubmitForApproval(browser)
    expect(joNumber).toBeTruthy()

    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD)
    await page.goto(`${BASE_URL}/jo/approval`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    const joRow = page.locator('table tbody tr').filter({ hasText: joNumber }).first()
    await expect(joRow).toBeVisible({ timeout: 15000 })
    console.log('Found JO in Approval Queue:', joNumber)

    // Click Approve
    const approveBtn = joRow.locator('button').filter({ hasText: /^approve$/i }).first()
    await expect(approveBtn).toBeVisible({ timeout: 10000 })
    await approveBtn.click()

    const confirmBtn = page.locator('button').filter({ hasText: /confirm|yes/i }).last()
    if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) await confirmBtn.click()

    // The Approval Queue renders no success toast — the row simply leaves the
    // queue once the status flips. Assert that, not a message that never exists.
    await expect(joRow).toBeHidden({ timeout: 20000 })
    console.log('Approve action confirmed.')

    // JO should stay out of the queue after a reload
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    const stillInQueue = await page.locator('table tbody tr').filter({ hasText: joNumber }).isVisible().catch(() => false)
    expect(stillInQueue, 'JO should be removed from Approval Queue after approval').toBeFalsy()

    // JO should appear in Archive
    await page.goto(`${BASE_URL}/jo/archive`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    const archiveRow = page.locator('table tbody tr').filter({ hasText: joNumber }).first()
    await expect(archiveRow).toBeVisible({ timeout: 15000 })
    console.log(`Confirmed JO ${joNumber} appears in Archive. ✅`)
  })

  test('Approval Queue → Reject a JO → status changes to Rejected', async ({ page, browser }) => {
    test.setTimeout(120000)

    const joNumber = await createJOAndSubmitForApproval(browser)
    expect(joNumber).toBeTruthy()

    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD)
    await page.goto(`${BASE_URL}/jo/approval`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    const joRow = page.locator('table tbody tr').filter({ hasText: joNumber }).first()
    await expect(joRow).toBeVisible({ timeout: 15000 })
    console.log('Found JO in Approval Queue:', joNumber)

    // Rejection remarks are collected through window.prompt(). Playwright
    // auto-dismisses native dialogs unless a handler is registered, which made
    // handleReject() bail out before ever calling the API.
    page.once('dialog', (dialog) => dialog.accept('Test rejection - does not meet quality standards.'))

    // Click Reject
    const rejectBtn = joRow.locator('button').filter({ hasText: /^reject$/i }).first()
    await expect(rejectBtn).toBeVisible({ timeout: 10000 })
    await rejectBtn.click()

    // No success toast here either — the row leaving the queue is the signal.
    await expect(joRow).toBeHidden({ timeout: 20000 })
    console.log('Reject action confirmed.')

    // JO should stay out of the queue after a reload
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    const stillInQueue = await page.locator('table tbody tr').filter({ hasText: joNumber }).isVisible().catch(() => false)
    expect(stillInQueue, 'JO should be removed from Approval Queue after rejection').toBeFalsy()

    // JO should show Rejected status in Job Orders list
    await page.goto(`${BASE_URL}/jo`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    const rejectedRow = page.locator('table tbody tr').filter({ hasText: joNumber }).first()
    await expect(rejectedRow).toBeVisible({ timeout: 15000 })
    const rejectedBadge = rejectedRow.locator('span, div').filter({ hasText: /^rejected$/i }).first()
    await expect(rejectedBadge).toBeVisible({ timeout: 10000 })
    console.log(`Confirmed JO ${joNumber} shows Rejected status. ✅`)
  })
})