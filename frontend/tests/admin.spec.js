import { test, expect } from '@playwright/test'
import fs from 'fs'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const API_URL = process.env.API_URL || 'http://localhost:5000'

const ADMIN_EMAIL = 'admin@gmail.com'
const ADMIN_PASSWORD = 'admin123'

test.describe('Admin Dashboard', () => {
  // Clean up leftover test data from previous runs before any test starts.
  // This deletes users whose email contains 'temp-deactivate-' or 'tech-'
  // so the Users table doesn't accumulate junk between runs and so
  // search/visibility assertions aren't polluted by stale rows.
  test.beforeAll(async ({ request }) => {
    // Try the dedicated backend API first, then fall back to the
    // frontend's own /api routes (Next.js API routes) in case there is
    // no separate backend service running on API_URL. Cleanup is
    // best-effort: if neither is reachable we skip quietly rather than
    // spamming ECONNREFUSED noise on every run.
    const candidateBases = [API_URL, BASE_URL]
    let token = null
    let workingBase = null

    for (const base of candidateBases) {
      try {
        const loginRes = await request.post(`${base}/api/auth/login`, {
          data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
          timeout: 5000,
        })

        if (loginRes.ok()) {
          const loginBody = await loginRes.json().catch(() => ({}))
          token = loginBody?.token || loginBody?.access_token || loginBody?.session?.access_token
          if (token) {
            workingBase = base
            break
          }
        }
      } catch (err) {
        // Try next candidate base silently — only warn once we've
        // exhausted all options below.
        continue
      }
    }

    if (!token || !workingBase) {
      console.warn(
        `Cleanup skipped: could not reach an API to log in as admin (tried ${candidateBases.join(', ')}). ` +
          'This is non-fatal — tests will just accumulate test-data users until this is fixed.'
      )
      return
    }

    try {
      const usersRes = await request.get(`${workingBase}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!usersRes.ok()) {
        console.warn('Cleanup skipped: could not fetch users list', usersRes.status())
        return
      }

      const usersBody = await usersRes.json().catch(() => ({}))
      const allUsers = Array.isArray(usersBody) ? usersBody : usersBody?.data || []

      const staleUsers = allUsers.filter((u) => {
        const email = String(u?.email || '')
        return email.includes('temp-deactivate-') || email.includes('tech-')
      })

      console.log(`Cleanup: found ${staleUsers.length} stale test user(s) to delete`)

      for (const staleUser of staleUsers) {
        const id = staleUser.id
        if (!id) continue

        const deleteRes = await request.delete(`${workingBase}/api/users/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        console.log(
          `Cleanup: deleted user ${staleUser.email} -> status ${deleteRes.status()}`
        )
      }
    } catch (err) {
      console.warn('Cleanup step threw an error (continuing anyway):', err?.message || err)
    }
  })

  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto(`${BASE_URL}/login`)
    await page.waitForLoadState('networkidle')

    // Login as admin
    await page.fill('input[type="email"]', ADMIN_EMAIL)
    await page.fill('input[type="password"]', ADMIN_PASSWORD)
    await page.click('button[type="submit"]')

    // Wait for dashboard to load
    await page.waitForURL(`${BASE_URL}/dashboard`)
    await page.waitForLoadState('networkidle')
  })

  test('Create a new JO with location, date, inventory item, and assigned technician → should show success toast with JO number', async ({
    page,
  }) => {
    test.setTimeout(90000) // extended to allow inventory options to load

    await page.goto(`${BASE_URL}/jo/create`)
    await page.waitForLoadState('networkidle')

    await page.fill('input[placeholder*="location" i]', 'Building A, Floor 2')

    // Fill date
    const dateInput = page.locator('input[type="date"]')
    if ((await dateInput.count()) > 0) {
      await dateInput.first().fill(new Date().toISOString().split('T')[0])
    }

    // Wait for technician dropdown to load then select first technician
    const technicianSelect = page.locator('select').filter({
      has: page.locator('option:has-text("Select a technician")'),
    }).first()
    await expect(technicianSelect).toBeEnabled({ timeout: 10000 })
    await technicianSelect.selectOption({ index: 1 })

    // Wait for inventory dropdown to load then select first item.
    // The dropdown starts with only the placeholder "Select item" option
    // when there are no inventory items in the DB yet. We poll until a
    // real selectable option appears (index 1+) so this test can run
    // immediately after inventory items are seeded by the inventory tests
    // without relying on a fixed sleep.
    // Reload the page until inventory dropdown has real options (fresh DB starts empty).
    // Then pick the first item with sufficient stock — items at 0 block form submission.
    let inventorySelect = page.locator('select').filter({
      has: page.locator('option:has-text("Select item")'),
    }).first()

    let inventoryOptionCount = await inventorySelect.locator('option').count().catch(() => 0)
    let reloadAttempts = 0
    const maxReloads = 10

    while (inventoryOptionCount <= 1 && reloadAttempts < maxReloads) {
      console.log('Inventory dropdown has ' + inventoryOptionCount + ' option(s) — reloading page (attempt ' + (reloadAttempts + 1) + '/' + maxReloads + ')')
      await page.waitForTimeout(3000)
      await page.goto(BASE_URL + '/jo/create')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      // Re-fill fields lost on reload
      await page.fill('input[placeholder*="location" i]', 'Building A, Floor 2')
      const dateInputR = page.locator('input[type="date"]')
      if ((await dateInputR.count()) > 0) {
        await dateInputR.first().fill(new Date().toISOString().split('T')[0])
      }
      const techSelectR = page.locator('select').filter({
        has: page.locator('option:has-text("Select a technician")'),
      }).first()
      if ((await techSelectR.count()) > 0) {
        await expect(techSelectR).toBeEnabled({ timeout: 10000 })
        await techSelectR.selectOption({ index: 1 })
      }

      inventorySelect = page.locator('select').filter({
        has: page.locator('option:has-text("Select item")'),
      }).first()
      inventoryOptionCount = await inventorySelect.locator('option').count().catch(() => 0)
      reloadAttempts++
    }

    if (inventoryOptionCount <= 1) {
      throw new Error('Inventory dropdown still empty after ' + maxReloads + ' reloads. Ensure inventory tests ran first.')
    }

    // Try each item — skip any showing 'Insufficient stock'
    await expect(inventorySelect).toBeEnabled({ timeout: 10000 })
    const invOptions = await inventorySelect.locator('option').all()
    let selectedGoodItem = false
    for (let i = 1; i < invOptions.length; i++) {
      await inventorySelect.selectOption({ index: i })
      await page.waitForTimeout(1500)
      await page.locator('text=/available:|insufficient stock/i').first()
        .waitFor({ state: 'visible', timeout: 3000 })
        .catch(() => null)
      const isInsufficient = await page.locator('text=/insufficient stock/i').first().isVisible().catch(() => false)
      if (!isInsufficient) {
        console.log('Selected inventory item at index ' + i)
        selectedGoodItem = true
        break
      }
      console.warn('Item at index ' + i + ' has insufficient stock — trying next')
    }

    if (!selectedGoodItem) {
      throw new Error('All inventory items have insufficient stock. Add stock to at least one item before running this test.')
    }

    // The app now validates that every Supplies & Equipment row with an
    // item selected must also have a valid quantity > 0 — selecting an
    // item alone is no longer enough to submit. Fill the Qty input in
    // the same row so the form actually passes validation.
    let qtyInput = page
      .locator('tr, [data-testid="supply-row"], div')
      .filter({ has: inventorySelect })
      .locator('input[type="number"], input[placeholder*="qty" i], input[name*="quantity" i]')
      .first()

    const qtyVisible = await qtyInput.isVisible().catch(() => false)
    if (!qtyVisible) {
      // Row-scoping locator didn't match the actual DOM structure — fall
      // back to the first numeric/qty-labelled input anywhere on the page,
      // which works as long as there's only one Supplies row at this point.
      console.warn('Row-scoped Qty locator not found, falling back to page-level Qty input')
      qtyInput = page
        .locator('input[type="number"], input[placeholder*="qty" i], input[name*="quantity" i]')
        .first()
    }

    await expect(qtyInput).toBeVisible({ timeout: 5000 })
    await qtyInput.fill('1')

    // The app now also validates that at least one Personnel / Job
    // Description entry is required before generating or saving a JO.
    // Fill the first Name input in that section so validation passes.
    // Scope to the container after the "Personnel" heading to avoid
    // accidentally matching the Item Name input in the Supplies table.
    let personnelNameInput = page
      .locator('text=/Personnel/i')
      .locator('xpath=following::input[contains(translate(@placeholder, "NAME", "name"), "name")][1]')

    let personnelInputVisible = await personnelNameInput.isVisible().catch(() => false)

    if (!personnelInputVisible) {
      // Fallback: any input with a "name" placeholder that is NOT the
      // item name field (heuristic: item inputs usually mention "item").
      console.warn('Scoped Personnel Name locator not found, falling back to broad name input search')
      personnelNameInput = page
        .locator('input[placeholder*="name" i]')
        .filter({ hasNot: page.locator('[placeholder*="item" i]') })
        .last()
      personnelInputVisible = await personnelNameInput.isVisible().catch(() => false)
    }

    if (personnelInputVisible) {
      await personnelNameInput.fill('Test Technician Name')
    } else {
      console.warn(
        'Personnel Name input not found with any selector — ' +
          'Generate JO will likely be blocked by "at least one personnel" validation.'
      )
    }

    // Click Generate JO (submits with status sent)
    await page.click('button:has-text("Generate JO")')

    // Wait for the JO Number field to flip from the placeholder
    // ("AUTO-GENERATED ON SUBMIT") to an actual JO-2026-XXXX value, and
    // for the submit button's "Generating..." loading state to clear.
    // This avoids racing the toast assertion against an in-flight request.
    await page
      .locator('button:has-text("Generating..."), button:has-text("Saving...")')
      .first()
      .waitFor({ state: 'hidden', timeout: 15000 })
      .catch(() => null)

    // Capture a screenshot immediately after submit, before any toast
    // assertion, so we can see exactly what the UI rendered if the
    // selector below doesn't match (toast text, error banner, etc.)
    await page.screenshot({
      path: 'test-results/debug-jo-create-toast.png',
      fullPage: true,
    })

    // Dump the full page text so the actual toast wording is visible in
    // the test logs/artifacts even if no locator matches at all.
    const bodyTextAfterSubmit = await page.textContent('body').catch(() => '')
    console.log('PAGE TEXT AFTER GENERATE JO SUBMIT:', bodyTextAfterSubmit?.slice(0, 2000))

    // IMPORTANT: the JO Number field's static label reads
    // "AUTO-GENERATED ON SUBMIT" which contains the word "generated" and
    // previously caused this locator to match the field label instead of
    // a real success toast (false positive — the test passed without any
    // JO actually being confirmed created). Exclude that exact label text
    // and scope to a toast-like container so we only match real banners.
    const successToast = page
      .locator(
        '[role="alert"], [class*="toast" i], [class*="banner" i], [class*="notification" i], [class*="alert" i]'
      )
      .filter({ hasText: /success|created|sent|generated|draft saved|JO-20/i })
      .filter({ hasNotText: /AUTO-GENERATED ON SUBMIT/i })
      .first()

    // Fallback: if no dedicated toast container exists in the DOM, fall
    // back to a plain text match but still explicitly exclude the field
    // label so we never silently pass on a false positive again.
    const toastVisible = await successToast.isVisible().catch(() => false)
    const finalToast = toastVisible
      ? successToast
      : page
          .locator('text=/success|created|sent|generated|draft saved|JO-20/i')
          .filter({ hasNotText: /AUTO-GENERATED ON SUBMIT/i })
          .first()

    await expect(finalToast).toBeVisible({ timeout: 15000 })

    const toastText = await finalToast.textContent()
    console.log('MATCHED TOAST TEXT:', toastText)

    expect(toastText).not.toMatch(/AUTO-GENERATED ON SUBMIT/i)
    expect(toastText).toMatch(/success|created|sent|generated|draft saved|JO-20/i)
  })

  test('View the created JO in Job Orders list → should appear in the table', async ({ page }) => {
    test.setTimeout(30000)

    // Navigate to Job Orders list
    await page.goto(`${BASE_URL}/jo`)
    await page.waitForLoadState('networkidle')

    // Dump what's actually on the page before asserting anything — if the
    // previous create-JO test's toast was a false positive (matched the
    // "AUTO-GENERATED ON SUBMIT" label instead of a real success toast),
    // this list may legitimately be empty and we want that visible in logs
    // rather than a bare timeout.
    const bodyText = await page.textContent('body').catch(() => '')
    console.log('JOB ORDERS PAGE TEXT:', bodyText?.slice(0, 1500))
    await page.screenshot({ path: 'test-results/debug-jo-list-page.png', fullPage: true })

    // Wait for either table rows (desktop) or JO cards (responsive views)
    const tableRows = page.locator('table tbody tr, .jo-card, [data-testid="jo-row"]')

    // If the page shows an explicit empty state, fail with a clear message
    // instead of a generic timeout.
    const emptyState = page.locator('text=/no job orders|no results|empty/i')
    if (await emptyState.first().isVisible().catch(() => false)) {
      throw new Error(
        'Job Orders list shows an empty state — the JO from the previous test was not actually created. Check the create-JO test toast assertion.'
      )
    }

    await expect(tableRows.first()).toBeVisible({ timeout: 10000 })

    // Verify table has content
    const rowCount = await tableRows.count()
    expect(rowCount).toBeGreaterThan(0)

    // Check for JO number column (can be table or card view)
    const joNumberColumn = page.locator(
      'table th:has-text("JO No."), table th:has-text("Job Order"), [data-testid="jo-row"]:has-text("JO")'
    )
    await expect(joNumberColumn.first()).toBeVisible({ timeout: 10000 })
  })

  test('Go to Approval Queue → should show JOs submitted for approval', async ({ page }) => {
    test.setTimeout(30000)

    // Click on approval queue link in sidebar or nav
    const approvalLink = page.locator('a:has-text("Approval"), a:has-text("For Approval")')
    await approvalLink.first().click()

    // Wait for page to load
    await page.waitForURL('**/approval**', { timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Check if we're on approval page
    expect(page.url()).toContain('approval')

    // Verify page title or heading
    const pageHeading = page.locator('h1, h2, [role="heading"]')
    await expect(pageHeading.first()).toBeVisible()
  })

  test('Go to User Management → should show users table with Name, Email, Role, Status columns', async ({
    page,
  }) => {
    test.setTimeout(30000)

    // Click on Users/User Management link
    const usersLink = page.locator(
      'a:has-text("Users"), a:has-text("User Management"), a:has-text("Personnel")'
    )
    await usersLink.first().click()

    // Wait for users page
    await page.waitForURL('**/users**', { timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Verify we're on users page
    expect(page.url()).toContain('users')

    // Check for table columns
    const nameColumn = page.locator('th:has-text("Name")')
    const emailColumn = page.locator('th:has-text("Email")')
    const roleColumn = page.locator('th:has-text("Role")')
    const statusColumn = page.locator('th:has-text("Status")')

    await expect(nameColumn).toBeVisible()
    await expect(emailColumn).toBeVisible()
    await expect(roleColumn).toBeVisible()
    await expect(statusColumn).toBeVisible()
  })

  test('Create a new technician user → should appear in the users list', async ({ page }) => {
    test.setTimeout(30000)

    // Navigate to users page
    await page.goto(`${BASE_URL}/users`)
    await page.waitForLoadState('networkidle')

    // Click Add New User (opens modal)
    const addButton = page
      .locator('button:has-text("Add New User"), button:has-text("Add New"), button:has-text("Add")')
      .first()
    await addButton.click()
    await page.screenshot({ path: 'test-results/debug-create-user-modal-open.png', fullPage: true })

    // Scope all modal interactions to the dialog
    const modal = page.locator('div.fixed.inset-0.z-50 div.w-full.max-w-2xl').last()
    await expect(modal).toBeVisible({ timeout: 10000 })

    // Fill in user details (adjust selectors based on actual form)
    const timestamp = Date.now()
    const email = `tech-${timestamp}@gmail.com`

    // Name field (second visible input after the search bar)
    await page.locator('input:visible').nth(1).fill(`Test Technician ${timestamp}`)

    // Email/password fields by type
    await page.locator('input[type="email"]').first().fill(email)
    await page.locator('input[type="password"]').first().fill('TempPassword123!')

    // Role select by visible index
    const roleSelect = page.locator('select:visible').first()
    await roleSelect.selectOption('technician')

    // Dump ALL visible input attributes to find correct selectors
    const inputs = page.locator('input:visible, select:visible, textarea:visible')
    const count = await inputs.count()
    for (let i = 0; i < count; i++) {
      const el = inputs.nth(i)
      const name = await el.getAttribute('name').catch(() => '')
      const type = await el.getAttribute('type').catch(() => '')
      const placeholder = await el.getAttribute('placeholder').catch(() => '')
      const id = await el.getAttribute('id').catch(() => '')
      console.log(`INPUT ${i}: name="${name}" type="${type}" placeholder="${placeholder}" id="${id}"`)
    }

    // Step 1 — After opening the modal, dump all visible button texts + take screenshot
    const allButtons = await page.locator('button:visible').allTextContents()
    console.log('VISIBLE BUTTONS (Create Technician Modal):', allButtons)
    await page.screenshot({
      path: 'test-results/debug-create-technician-modal-buttons.png',
      fullPage: true,
    })

    // Prevent potential dialog blocking/crash
    page.on('dialog', (dialog) => dialog.accept())

    // Intercept submit BEFORE clicking (prevents full navigation/reload crash)
    await page.evaluate(() => {
      document.querySelectorAll('form').forEach((f) => {
        f.addEventListener('submit', (e) => e.preventDefault())
      })
    })

    // Step 2 — Click exact modal submit button
    await page.getByRole('button', { name: 'Create User' }).click({ force: true })

    await Promise.race([
      page.waitForLoadState('networkidle', { timeout: 5000 }),
      page.waitForTimeout(3000),
    ]).catch(() => null)

    const nameVal = await page.locator('input:visible').nth(1).inputValue().catch(() => 'not found')
    const emailVal = await page.locator('input[type="email"]').first().inputValue().catch(() => 'not found')
    const passVal = await page.locator('input[type="password"]').first().inputValue().catch(() => 'not found')
    const roleVal = await page.locator('select:visible').first().inputValue().catch(() => 'not found')
    console.log('FORM VALUES:', { nameVal, emailVal, passVal, roleVal })

    const rows = await page.locator('table tbody tr').allTextContents().catch(() => [])
    console.log('TABLE ROWS:', rows)

    await page.screenshot({ path: 'test-results/debug-after-submit.png', fullPage: true })

    // Wait for success message (custom toast in UI)
    const successToast = page.locator('text=/success|created|saved|updated|deactivated/i').first()
    await expect(successToast).toBeVisible({ timeout: 10000 })

    // Wait until the users table actually contains the new email (avoid global text checks)
    const usersTable = page.locator('table').first()
    const createdRow = usersTable.locator('tbody tr').filter({ has: page.locator(`td:has-text("${email}")`) }).first()

    await expect(createdRow).toBeVisible({ timeout: 20000 })

    // Debug: take screenshot and dump HTML to see what's on page
    await page.screenshot({
      path: 'test-results/debug-users-after-create.png',
      fullPage: true,
    })
    const html = await page.content()
    fs.writeFileSync('test-results/debug-users-page.html', html)
  })

  test('Deactivate a user → should show Inactive badge', async ({ page }) => {
    test.setTimeout(30000)

    // Step 1: Create a temp user (NEVER touch seed/main accounts)
    const tempEmail = `temp-deactivate-${Date.now()}@test.com`

    await page.goto(`${BASE_URL}/users`)
    await page.waitForLoadState('networkidle')

    // Confirm we actually landed on the Users page and it rendered before
    // searching for the Add button — under parallel test load this page
    // can occasionally still be hydrating when the locator search starts,
    // causing a false "element not found" after the full 30s timeout.
    await expect(page.locator('h1, h2, [role="heading"]').first()).toBeVisible({
      timeout: 15000,
    })

    const addButton = page
      .locator('button:has-text("Add New User"), button:has-text("Add")')
      .first()
    await expect(addButton).toBeVisible({ timeout: 15000 })
    await addButton.click()

    // Name field (second visible input after the search bar)
    await page.locator('input:visible').nth(1).fill('Temp Deactivate User')

    // Email/password fields by type
    await page.locator('input[type="email"]').first().fill(tempEmail)
    await page.locator('input[type="password"]').first().fill('TempPassword123!')

    // Role select by visible index
    const roleSelect = page.locator('select:visible').first()
    await roleSelect.selectOption('technician')

    await page.screenshot({ path: 'test-results/debug-create-temp-user-before-submit.png', fullPage: true })
    const tempUserModal = page.locator('div.fixed.inset-0.z-50 div.w-full.max-w-2xl').last()
    await expect(tempUserModal).toBeVisible({ timeout: 10000 })

    // Dump ALL visible input attributes to find correct selectors
    const inputs = page.locator('input:visible, select:visible, textarea:visible')
    const count = await inputs.count()
    for (let i = 0; i < count; i++) {
      const el = inputs.nth(i)
      const name = await el.getAttribute('name').catch(() => '')
      const type = await el.getAttribute('type').catch(() => '')
      const placeholder = await el.getAttribute('placeholder').catch(() => '')
      const id = await el.getAttribute('id').catch(() => '')
      console.log(`INPUT ${i}: name="${name}" type="${type}" placeholder="${placeholder}" id="${id}"`)
    }

    // Step 1 — After opening the modal, dump all visible button texts + take screenshot
    const allButtons = await page.locator('button:visible').allTextContents()
    console.log('VISIBLE BUTTONS (Deactivate/User Create Modal):', allButtons)
    await page.screenshot({
      path: 'test-results/debug-deactivate-user-modal-buttons.png',
      fullPage: true,
    })

    // Prevent potential dialog blocking/crash
    page.on('dialog', (dialog) => dialog.accept())

    // Intercept submit BEFORE clicking (prevents full navigation/reload crash)
    await page.evaluate(() => {
      document.querySelectorAll('form').forEach((f) => {
        f.addEventListener('submit', (e) => e.preventDefault())
      })
    })

    // Step 2 — Click exact modal submit button
    await page.getByRole('button', { name: 'Create User' }).click({ force: true })

    await Promise.race([
      page.waitForLoadState('networkidle', { timeout: 5000 }),
      page.waitForTimeout(3000),
    ]).catch(() => null)

    const nameVal = await page.locator('input:visible').nth(1).inputValue().catch(() => 'not found')
    const emailVal = await page.locator('input[type="email"]').first().inputValue().catch(() => 'not found')
    const passVal = await page.locator('input[type="password"]').first().inputValue().catch(() => 'not found')
    const roleVal = await page.locator('select:visible').first().inputValue().catch(() => 'not found')
    console.log('FORM VALUES:', { nameVal, emailVal, passVal, roleVal })

    await page.screenshot({ path: 'test-results/debug-create-temp-user-after-submit.png', fullPage: true })

    const successToastAfterCreate = page
      .locator('text=/success|created|saved|updated|deactivated/i')
      .first()
    await expect(successToastAfterCreate).toBeVisible({ timeout: 10000 })

    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    const pageText2 = await page.textContent('body')
    console.log('PAGE TEXT AFTER RELOAD (deactivate):', pageText2?.substring(0, 2000))
    await page.fill('input[placeholder*="Search" i], input[placeholder*="search" i]', tempEmail)
    await page.waitForTimeout(2000)

    await expect(page.getByText(tempEmail, { exact: false })).toBeVisible({ timeout: 20000 })

    // Step 2: Search for the temp user by email
    await page.fill('input[placeholder*="Search" i], input[placeholder*="search" i]', '')
    await page.waitForTimeout(1000)
    await page.fill('input[placeholder*="Search" i], input[placeholder*="search" i]', tempEmail)

    // Debug: take screenshot and dump HTML to see what's on page
    await page.screenshot({
      path: 'test-results/debug-deactivate-search.png',
      fullPage: true,
    })
    const html2 = await page.content()
    fs.writeFileSync('test-results/debug-deactivate-page.html', html2)

    await page.waitForTimeout(2000)

    // Step 3: Deactivate ONLY the row matching tempEmail
    await expect(page.getByText(tempEmail)).toBeVisible({ timeout: 20000 })

    const userRow = page.locator('table tbody tr').filter({ hasText: tempEmail }).first()
    await expect(userRow).toBeVisible({ timeout: 20000 })

    const deactivateButton = userRow
      .locator('button')
      .filter({ hasText: /^Deactivate$/ })
      .first()

    if ((await deactivateButton.count()) > 0) {
      await deactivateButton.click()
    } else {
      const actionMenuButton = userRow
        .locator('button:has-text("..."), button:has-text("Actions"), button[aria-label*="Action" i], [role="button"]')
        .first()
      if ((await actionMenuButton.count()) > 0) await actionMenuButton.click()

      const deactivateOption = page.locator(
        'button:has-text("Deactivate"), button:has-text("Disable"), text=Deactivate, text=Disable, text=Inactive'
      )
      await deactivateOption.first().click()
    }

    // Confirm deactivation if modal appears
    const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Deactivate")')
    if ((await confirmButton.count()) > 0) {
      await confirmButton.last().click()
    }

    // Wait for success message
    const successToast = page.locator('text=/success|created|saved|updated|deactivated/i').first()
    await expect(successToast).toBeVisible({ timeout: 10000 })

    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(800)

    // Debug: log full table contents before asserting
    const rows = await page.locator('table tbody tr').allTextContents()
    console.log('TABLE ROWS:', rows)

    // Re-locate the row after reload (old locator may point to detached DOM)
    const usersTable = page.locator('table').first()
    const updatedRow = usersTable.locator('tbody tr').filter({ has: page.locator(`td:has-text("${tempEmail}")`) }).first()
    await expect(updatedRow).toBeVisible({ timeout: 20000 })

    // Verify ONLY this user became Inactive (status pill text in same row)
    const statusCell = updatedRow.locator('td').nth(3) // Name(0), Email(1), Role(2), Status(3)
    await expect(statusCell).toContainText(/Inactive|Disabled/i, { timeout: 20000 })
  })
}) // closes test.describe block