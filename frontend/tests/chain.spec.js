import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

const ADMIN_EMAIL = 'admin@gmail.com'
const ADMIN_PASSWORD = 'admin123'
const TECHNICIAN_EMAIL = 'technician@gmail.com'
const TECHNICIAN_PASSWORD = 'technician123'

async function loginAs(page, email, password) {
  await page.goto(`${BASE_URL}/login`)
  await page.waitForLoadState('networkidle')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(`${BASE_URL}/dashboard`)
  await page.waitForLoadState('networkidle')
}

test.describe('Full Dispatch Chain', () => {
  test('Admin creates JO → technician marks Processing → uploads proof → submits → admin sees it in Approval Queue', async ({
    browser,
  }) => {
    test.setTimeout(180000)

    const uniqueLocation = `Chain Test Site ${Date.now()}`

    // ── STEP 1: Admin creates and sends a JO ──
    const adminContext = await browser.newContext()
    const adminPage = await adminContext.newPage()
    await loginAs(adminPage, ADMIN_EMAIL, ADMIN_PASSWORD)

    await adminPage.goto(`${BASE_URL}/jo/create`)
    await adminPage.waitForLoadState('networkidle')

    await adminPage.fill('input[placeholder*="location" i]', uniqueLocation)

    const dateInput = adminPage.locator('input[type="date"]')
    if ((await dateInput.count()) > 0) {
      await dateInput.first().fill(new Date().toISOString().split('T')[0])
    }

    const technicianSelect = adminPage
      .locator('select')
      .filter({ has: adminPage.locator('option:has-text("Select a technician")') })
      .first()
    await expect(technicianSelect).toBeEnabled({ timeout: 10000 })
    await technicianSelect.selectOption({ index: 1 })

    // Reload until inventory dropdown has real options, then pick one with sufficient stock
    let inventorySelect = adminPage
      .locator('select')
      .filter({ has: adminPage.locator('option:has-text("Select item")') })
      .first()

    let inventoryOptionCount = await inventorySelect.locator('option').count().catch(() => 0)
    let reloadAttempts = 0
    const maxReloads = 10

    while (inventoryOptionCount <= 1 && reloadAttempts < maxReloads) {
      console.log('Chain: inventory dropdown has ' + inventoryOptionCount + ' option(s) — reloading (attempt ' + (reloadAttempts + 1) + '/' + maxReloads + ')')
      await adminPage.waitForTimeout(3000)
      await adminPage.goto(BASE_URL + '/jo/create')
      await adminPage.waitForLoadState('networkidle')
      await adminPage.waitForTimeout(1000)

      // Re-fill fields lost on reload
      await adminPage.fill('input[placeholder*="location" i]', uniqueLocation)
      const dateInputR = adminPage.locator('input[type="date"]')
      if ((await dateInputR.count()) > 0) {
        await dateInputR.first().fill(new Date().toISOString().split('T')[0])
      }
      const techSelectR = adminPage
        .locator('select')
        .filter({ has: adminPage.locator('option:has-text("Select a technician")') })
        .first()
      if ((await techSelectR.count()) > 0) {
        await expect(techSelectR).toBeEnabled({ timeout: 10000 })
        await techSelectR.selectOption({ index: 1 })
      }

      inventorySelect = adminPage
        .locator('select')
        .filter({ has: adminPage.locator('option:has-text("Select item")') })
        .first()
      inventoryOptionCount = await inventorySelect.locator('option').count().catch(() => 0)
      reloadAttempts++
    }

    if (inventoryOptionCount <= 1) {
      throw new Error('Chain: inventory dropdown still empty after ' + maxReloads + ' reloads.')
    }

    // Pick first item with sufficient stock
    await expect(inventorySelect).toBeEnabled({ timeout: 10000 })
    const invOptions = await inventorySelect.locator('option').all()
    let selectedGoodItem = false
    for (let i = 1; i < invOptions.length; i++) {
      await inventorySelect.selectOption({ index: i })
      await adminPage.waitForTimeout(1500)
      await adminPage.locator('text=/available:|insufficient stock/i').first()
        .waitFor({ state: 'visible', timeout: 3000 })
        .catch(() => null)
      const isInsufficient = await adminPage.locator('text=/insufficient stock/i').first().isVisible().catch(() => false)
      if (!isInsufficient) {
        console.log('Chain: selected inventory item at index ' + i)
        selectedGoodItem = true
        break
      }
      console.warn('Chain: item at index ' + i + ' has insufficient stock — trying next')
    }

    if (!selectedGoodItem) {
      throw new Error('Chain: all inventory items have insufficient stock.')
    }

    const qtyInput = adminPage
      .locator('tr, [data-testid="supply-row"], div')
      .filter({ has: inventorySelect })
      .locator('input[type="number"], input[placeholder*="qty" i], input[name*="quantity" i]')
      .first()
    await expect(qtyInput).toBeVisible({ timeout: 5000 })
    await qtyInput.fill('1')

    const personnelNameInput = adminPage
      .locator('text=/Personnel/i')
      .locator('xpath=following::input[contains(translate(@placeholder, "NAME", "name"), "name")][1]')
    await expect(personnelNameInput).toBeVisible({ timeout: 5000 })
    await personnelNameInput.fill('Chain Test Technician')

    // Capture console errors and failed network requests around the
    // submit, since the DB confirmed a prior run displayed a JO number
    // in this field WITHOUT the record ever being created — meaning this
    // field reflects a client-side reserved/next-available number, not
    // proof that the save actually succeeded. We need to see the real
    // API response to know what happened.
    adminPage.on('console', (msg) => {
      if (msg.type() === 'error') console.log('[create-jo console error]', msg.text())
    })
    adminPage.on('pageerror', (err) => console.log('[create-jo page error]', err.message))

    const createJoResponsePromise = adminPage
      .waitForResponse(
        (res) => res.request().method() === 'POST' && /job-orders|jo\/create|\/jo$/i.test(res.url()),
        { timeout: 15000 }
      )
      .catch((err) => {
        console.log('No matching POST response captured:', err.message)
        return null
      })

    await adminPage.click('button:has-text("Generate JO")')

    const createJoResponse = await createJoResponsePromise
    if (createJoResponse) {
      console.log('Create JO response status:', createJoResponse.status())
      console.log('Create JO response URL:', createJoResponse.url())
      const responseBody = await createJoResponse.text().catch(() => '<could not read body>')
      console.log('Create JO response body:', responseBody.slice(0, 1000))

      expect(
        createJoResponse.ok(),
        `Create JO API call failed with status ${createJoResponse.status()}. Body: ${responseBody.slice(0, 500)}`
      ).toBeTruthy()
    } else {
      console.log(
        'WARNING: could not capture the create-JO network request automatically. ' +
          'The regex matching its URL may be wrong for this app — check the Network tab manually ' +
          'to find the real endpoint and update the waitForResponse pattern above.'
      )
    }

    // Read the JO number directly from the JO Number field after submit
    // as a fallback, but PREFER the number confirmed by the actual API
    // response body when available, since we've proven the field can
    // display a number that was never persisted to the database.
    const joNumberLocator = adminPage.locator('text=JO Number').locator('xpath=following::input[1]')
    await expect(joNumberLocator).toBeVisible({ timeout: 30000 })

    const joNumberFieldValue = (await joNumberLocator.inputValue())?.trim()
    const joNumberFromField = joNumberFieldValue?.match(/JO-[^\s]+/i)?.[0]

    let joNumber = joNumberFromField
    if (createJoResponse?.ok()) {
      try {
        const parsedBody = await createJoResponse.json()
        const joNumberFromApi =
          parsedBody?.jo_number || parsedBody?.data?.jo_number || parsedBody?.job_order?.jo_number
        if (joNumberFromApi) {
          joNumber = joNumberFromApi
          console.log('Using JO number confirmed by API response body:', joNumber)
        }
      } catch (err) {
        console.log('Could not parse create-JO response body as JSON:', err.message)
      }
    }

    expect(
      joNumber,
      `Could not determine a JO number from either the field display ("${joNumberFieldValue}") ` +
        'or the API response. The JO may not have been created at all.'
    ).toBeTruthy()
    console.log('Proceeding with JO number:', joNumber)

    // Take a screenshot regardless of outcome so we can see exactly what
    // the page looked like right after submission.
    await adminPage.screenshot({ path: 'test-results/debug-after-generate-jo.png', fullPage: true })

    await adminContext.close()

    // ── STEP 2: Technician finds THIS JO and marks it Processing ──
    // CONFIRMED BY DEVELOPER: Mark as Processing, Upload Proof, Take
    // Photo/Choose File, Save Proof, and Submit for Approval ALL happen
    // inline in the Job Orders table row's Actions column — there is no
    // need to open the JO detail page (View/Download PDF) at all for this
    // workflow. Earlier versions of this test incorrectly navigated into
    // the detail page first, which only has Download PDF and nothing
    // else — that's why "Upload Proof" was never found there.
    const techContext = await browser.newContext()
    const techPage = await techContext.newPage()
    await loginAs(techPage, TECHNICIAN_EMAIL, TECHNICIAN_PASSWORD)

    await techPage.goto(`${BASE_URL}/jo`)
    await techPage.waitForLoadState('networkidle')
    await expect(techPage.locator('table tbody tr').first()).toBeVisible({ timeout: 20000 })

    // IMPORTANT: this must be a HARD assertion, not a silent fallback to
    // "first row in the table". A previous version of this test fell
    // back to testing whatever JO happened to be listed first if the
    // newly-created one wasn't found — which means it could report
    // "passing" while actually verifying the wrong JO and hiding a real
    // bug. If this assertion fails, that needs to be investigated in the
    // app, not worked around in the test.
    const jobRow = techPage.locator('table tbody tr').filter({ hasText: joNumber })
    await expect(
      jobRow,
      `Technician's Job Orders list does not contain ${joNumber} after admin sent it. ` +
        'If this fails, check: (1) receiver_id is being saved correctly on JO creation, ' +
        '(2) the technician list query/filter, (3) realtime/refresh timing.'
    ).toBeVisible({ timeout: 15000 })

    const sentStatusCell = jobRow.locator('td').filter({ hasText: /^sent$/i })
    await expect(sentStatusCell).toBeVisible({ timeout: 10000 })
    console.log(`Confirmed ${joNumber} is visible to technician with status Sent.`)

    const processingButton = jobRow.getByRole('button', { name: /mark as processing/i })
    await expect(processingButton).toBeVisible({ timeout: 10000 })
    await processingButton.click()

    // After marking Processing, the row's status cell and its available
    // action buttons should update in place (no navigation expected).
    const processingStatusCell = jobRow.locator('td').filter({ hasText: /^processing$/i })
    await expect(processingStatusCell).toBeVisible({ timeout: 10000 })
    console.log(`Confirmed ${joNumber} status changed to Processing.`)

    // ── STEP 3: Technician clicks Upload Proof (in the same row),
    //            fills it in, saves it ──
    await techPage.screenshot({ path: 'test-results/debug-before-upload-proof.png', fullPage: true })
    const buttonsInRowAfterProcessing = await jobRow.locator('button, a').allTextContents().catch(() => [])
    console.log('Buttons/links in this row after marking Processing:', buttonsInRowAfterProcessing)

    const uploadProofButton = jobRow.getByRole('button', { name: /upload proof/i })
    await expect(uploadProofButton).toBeVisible({ timeout: 10000 })
    await uploadProofButton.click()

    const testFile = {
      name: 'chain-test-proof.png',
      mimeType: 'image/png',
      // Minimal valid 1x1 PNG so the upload is a real, parseable image.
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        'base64'
      ),
    }

    // Clicking "Upload Proof" likely expands an inline panel within or
    // just below this row (Take Photo / Choose File / Remarks / Save
    // Proof). Search within the row first, but fall back to a page-wide
    // search in case the expanded panel renders outside the <tr> (a <tr>
    // cannot contain block-level expanded content per HTML table rules,
    // so this fallback is actually quite likely to be needed).
    const fileInputInRow = jobRow.locator('input[type="file"]').first()
    const fileInputInRowAttached = await fileInputInRow
      .waitFor({ state: 'attached', timeout: 3000 })
      .then(() => true)
      .catch(() => false)

    const fileInput = fileInputInRowAttached ? fileInputInRow : techPage.locator('input[type="file"]').first()

    if (!fileInputInRowAttached) {
      console.log('File input not found inside the <tr> — falling back to page-wide search (expanded panel likely renders outside the row).')
    }

    const fileInputAttached = await fileInput
      .waitFor({ state: 'attached', timeout: 5000 })
      .then(() => true)
      .catch(() => false)

    if (fileInputAttached) {
      await fileInput.setInputFiles(testFile)
    } else {
      const chooseFileButton = techPage.getByRole('button', { name: /choose file/i })
      await expect(
        chooseFileButton,
        'Neither a direct <input type="file"> nor a "Choose File" button was found after clicking Upload Proof.'
      ).toBeVisible({ timeout: 5000 })

      const [fileChooser] = await Promise.all([
        techPage.waitForEvent('filechooser', { timeout: 10000 }),
        chooseFileButton.click(),
      ])
      await fileChooser.setFiles(testFile)
    }

    const remarksInput = techPage.locator('textarea').first()
    await expect(remarksInput).toBeVisible({ timeout: 5000 })
    await remarksInput.fill('Chain test — work completed, proof attached.')

    const saveProofButton = techPage.getByRole('button', { name: /save proof/i })
    await expect(saveProofButton).toBeVisible({ timeout: 5000 })
    await saveProofButton.click()

    const proofSavedIndicator = techPage.locator('text=/success|saved/i').first()
    await expect(proofSavedIndicator).toBeVisible({ timeout: 10000 })
    console.log(`Confirmed proof saved for ${joNumber}.`)

    // ── STEP 4: Technician submits for approval ──
    // Must scope to jobRow specifically — Playwright's strict mode
    // correctly flagged that "Submit for Approval" matches 3 buttons on
    // the page (other rows have their own copy of this button too).
    // Without scoping, .click() would be ambiguous about which JO it
    // actually submits.
    const submitButton = jobRow.getByRole('button', { name: /submit for approval/i })
    await expect(submitButton).toBeVisible({ timeout: 10000 })
    await submitButton.click()

    const confirmButton = techPage.getByRole('button', { name: /^(confirm|yes|submit)$/i })
    if (await confirmButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmButton.first().click()
    }

    const forApprovalStatusCell = jobRow.locator('td').filter({ hasText: /for approval/i })
    await expect(forApprovalStatusCell).toBeVisible({ timeout: 10000 })
    console.log(`Confirmed ${joNumber} status changed to For Approval.`)

    await techContext.close()

    // ── STEP 5: Admin sees THIS exact JO in the Approval Queue ──
    const verifyContext = await browser.newContext()
    const verifyPage = await verifyContext.newPage()
    await loginAs(verifyPage, ADMIN_EMAIL, ADMIN_PASSWORD)

    await verifyPage.goto(`${BASE_URL}/jo/approval`)
    await verifyPage.waitForLoadState('networkidle')

    // Diagnose before asserting: dump what's actually on this page so we
    // know whether it's an empty-state, a wrong-route redirect, or simply
    // a different JO list than expected.
    const approvalPageText = await verifyPage.textContent('body').catch(() => '')
    console.log('Approval Queue page text (first 1000 chars):', approvalPageText?.slice(0, 1000))
    console.log('Approval Queue actual URL after navigation:', verifyPage.url())
    await verifyPage.screenshot({ path: 'test-results/debug-approval-queue.png', fullPage: true })

    const emptyState = verifyPage.locator('text=/no.*approval|no results|empty/i')
    if (await emptyState.first().isVisible().catch(() => false)) {
      console.log('Approval Queue shows an explicit empty state — JO did not arrive here as expected.')
    }

    const approvalRow = verifyPage.locator('table tbody tr').filter({ hasText: joNumber })
    await expect(
      approvalRow,
      `Admin's Approval Queue does not contain ${joNumber} after technician submitted it. ` +
        'See the page text dump and screenshot above/in test-results for what actually rendered.'
    ).toBeVisible({ timeout: 10000 })
    console.log(`Confirmed admin sees ${joNumber} in the Approval Queue — full chain verified end to end.`)

    await verifyContext.close()
  })
})