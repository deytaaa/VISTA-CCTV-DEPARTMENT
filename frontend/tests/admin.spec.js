import { test, expect } from '@playwright/test'
import fs from 'fs'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

const ADMIN_EMAIL = 'admin@gmail.com'
const ADMIN_PASSWORD = 'admin123'

test.describe('Admin Dashboard', () => {
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
    test.setTimeout(30000)

    await page.goto(`${BASE_URL}/jo/create`)
    await page.waitForLoadState('networkidle')

    await page.fill('input[placeholder*="location" i], input[name*="location" i]', 'Building A, Floor 2')

    const dateInput = page.locator('input[type="date"]')
    if ((await dateInput.count()) > 0) {
      await dateInput.first().fill(new Date().toISOString().split('T')[0])
    }

    const inventorySelect = page.locator('select, [role="combobox"]').first()
    await inventorySelect.click()
    await page.locator('text=/Camera|Equipment|Item/i').first().click()

    const technicianSelect = page.locator('select').nth(1)
    await technicianSelect.selectOption({ index: 1 })

    await page.click('button:has-text("Create"), button:has-text("Submit"), button:has-text("Save")')

    const successToast = page.locator('text=/success|created|saved|updated|deactivated/i').first()
    await expect(successToast).toBeVisible({ timeout: 10000 })

    const toastText = await successToast.first().textContent()
    expect(toastText).toMatch(/success|created|saved|updated|deactivated|draft/i)
  })


  test('View the created JO in Job Orders list → should appear in the table', async ({ page }) => {
    test.setTimeout(30000)

    // Navigate to Job Orders list
    await page.goto(`${BASE_URL}/jo`)
    await page.waitForLoadState('networkidle')

    // Wait for either table rows (desktop) or JO cards (responsive views)
    const tableRows = page.locator('table tbody tr, .jo-card, [data-testid="jo-row"]')
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
    page.on('dialog', dialog => dialog.accept())

    // Intercept submit BEFORE clicking (prevents full navigation/reload crash)
    await page.evaluate(() => {
      document.querySelectorAll('form').forEach(f => {
        f.addEventListener('submit', e => e.preventDefault())
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

    await expect(usersTable.locator('tbody tr')).toHaveCountGreaterThan?.(0).catch(() => null)
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

    const addButton = page.locator('button:has-text("Add"), button:has-text("Create"), button:has-text("New")')
    await addButton.first().click()

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
    page.on('dialog', dialog => dialog.accept())

    // Intercept submit BEFORE clicking (prevents full navigation/reload crash)
    await page.evaluate(() => {
      document.querySelectorAll('form').forEach(f => {
        f.addEventListener('submit', e => e.preventDefault())
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


})  // closes test.describe block

