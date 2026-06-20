import { test, expect } from '@playwright/test'
import fs from 'fs'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

const ADMIN_EMAIL = 'admin@gmail.com'
const ADMIN_PASSWORD = 'admin123'

// Verifies a downloaded file is a real, non-empty PDF (not a 0-byte file
// or an HTML/JSON error page saved with a misleading .pdf extension).
async function assertIsRealPdf(download, label) {
  const suggestedFilename = download.suggestedFilename()
  console.log(`[${label}] Downloaded filename:`, suggestedFilename)
  expect(suggestedFilename.toLowerCase()).toMatch(/\.pdf$/)

  const savedPath = `test-results/${label}-${Date.now()}.pdf`
  await download.saveAs(savedPath)

  const stats = fs.statSync(savedPath)
  console.log(`[${label}] File size (bytes):`, stats.size)
  expect(stats.size).toBeGreaterThan(1000) // a real generated PDF is never this small

  const buffer = fs.readFileSync(savedPath)
  const header = buffer.subarray(0, 5).toString('utf-8')
  console.log(`[${label}] File header:`, header)
  expect(header).toBe('%PDF-')
}

test.describe('PDF Download', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`)
    await page.waitForLoadState('networkidle')

    await page.fill('input[type="email"]', ADMIN_EMAIL)
    await page.fill('input[type="password"]', ADMIN_PASSWORD)
    await page.click('button[type="submit"]')

    await page.waitForURL(`${BASE_URL}/dashboard`)
    await page.waitForLoadState('networkidle')
  })

  test('Download PDF from the Job Orders list → should save a valid PDF file', async ({ page }) => {
    test.setTimeout(30000)

    await page.goto(`${BASE_URL}/jo`)
    await page.waitForLoadState('networkidle')

    const emptyState = page.locator('text=/no job orders|no results|empty/i')
    if (await emptyState.first().isVisible().catch(() => false)) {
      throw new Error(
        'Job Orders list is empty — no JO exists to download a PDF from. ' +
          'Run the "Create a new JO" test first, or create one manually.'
      )
    }

    // The accessibility tree confirms rows render as a real <table> with
    // "View" and "Download PDF" as <a> links (href ending in /pdf), not
    // <button> elements. Scope to the first data row and grab the link by
    // its accessible name, which is the Playwright-recommended approach
    // (role-based locators survive markup/class changes better than
    // CSS/text selectors).
    const firstRow = page.locator('table tbody tr').first()
    await expect(firstRow).toBeVisible({ timeout: 10000 })

    const joNumberText = await firstRow.locator('td').first().textContent()
    console.log('Downloading PDF for JO row:', joNumberText?.trim())

    const downloadLink = firstRow.getByRole('link', { name: 'Download PDF' })
    await expect(downloadLink).toBeVisible({ timeout: 5000 })

    // This link uses target="_blank" — clicking it opens the PDF route in
    // a NEW browser tab rather than navigating the current page. That tab
    // then fetches the job order, generates the PDF client-side with
    // @react-pdf/renderer, and triggers the actual file download — all on
    // that popup tab, not on `page`. Listening for the popup first is
    // required, otherwise the download event is silently missed.
    const [popup] = await Promise.all([
      page.waitForEvent('popup', { timeout: 10000 }),
      downloadLink.click(),
    ])

    const download = await popup.waitForEvent('download', { timeout: 20000 })

    await assertIsRealPdf(download, 'list-row')
  })

  test('Download PDF from the JO detail page → should also save a valid PDF file', async ({ page }) => {
    test.setTimeout(30000)

    await page.goto(`${BASE_URL}/jo`)
    await page.waitForLoadState('networkidle')

    const emptyState = page.locator('text=/no job orders|no results|empty/i')
    if (await emptyState.first().isVisible().catch(() => false)) {
      throw new Error('Job Orders list is empty — cannot open a JO detail page to test PDF download from there.')
    }

    const firstRow = page.locator('table tbody tr').first()
    await expect(firstRow).toBeVisible({ timeout: 10000 })

    // "View" is also a link (not a button) per the accessibility snapshot —
    // clicking it navigates to /jo/[id], a real route change, so waiting
    // for navigation afterward is appropriate here (unlike a modal, which
    // wouldn't navigate at all).
    // Same hidden-duplicate concern as the Download PDF link above —
    // disambiguate to the visible "View" link only.
    const allViewLinksInRow = firstRow.getByRole('link', { name: 'View' })
    const viewLinkCount = await allViewLinksInRow.count()
    console.log('Number of "View" links matched in this row:', viewLinkCount)

    let viewLink = allViewLinksInRow.first()
    if (viewLinkCount > 1) {
      for (let i = 0; i < viewLinkCount; i++) {
        const candidate = allViewLinksInRow.nth(i)
        const isVisible = await candidate.isVisible().catch(() => false)
        console.log(`  View candidate[${i}] visible:`, isVisible)
        if (isVisible) {
          viewLink = candidate
          break
        }
      }
    }

    await expect(viewLink).toBeVisible({ timeout: 5000 })

    const viewHref = await viewLink.getAttribute('href')
    const viewTarget = await viewLink.getAttribute('target')
    console.log('View link href:', viewHref)
    console.log('View link target attr:', viewTarget)
    console.log('Current URL before click:', page.url())

    // Confirmed via diagnostics: this link has target="_blank", so it
    // opens the JO detail page in a NEW browser tab rather than
    // navigating the current page. That's why page.url() never changed
    // in earlier runs — the original `page` correctly stayed on /jo the
    // whole time; the actual navigation happened on a separate tab we
    // weren't watching. Listen for that popup instead of waiting for
    // page.url() to change.
    const detailOpensNewTab = viewTarget === '_blank'

    let detailPage = page
    if (detailOpensNewTab) {
      console.log('View opens in a new tab — listening for popup...')
      const [popup] = await Promise.all([
        page.waitForEvent('popup', { timeout: 10000 }),
        viewLink.click(),
      ])
      detailPage = popup
      await detailPage.waitForLoadState('networkidle')
      console.log('Popup tab URL after navigation:', detailPage.url())
    } else {
      await Promise.all([
        page.waitForURL(/\/jo\/[0-9a-f-]{8,}/, { timeout: 10000 }),
        viewLink.click(),
      ])
      await page.waitForLoadState('networkidle')
    }

    // From this point on, all assertions/interactions must use
    // `detailPage`, NOT `page` — `page` is still the original /jo list
    // tab when detailOpensNewTab is true.
    expect(detailPage.url()).toMatch(/\/jo\/[0-9a-f-]{8,}/)

    await detailPage.screenshot({ path: 'test-results/debug-after-view-click.png', fullPage: true })

    // On the detail page, "Download PDF" may render as a link or a button
    // depending on the page implementation — match either by accessible
    // role+name rather than assuming one element type. Must search within
    // detailPage, not the original `page`, since View opened a new tab.
    const downloadControl = detailPage
      .getByRole('link', { name: 'Download PDF' })
      .or(detailPage.getByRole('button', { name: 'Download PDF' }))
      .first()

    await expect(downloadControl).toBeVisible({ timeout: 10000 })

    const downloadControlTarget = await downloadControl.getAttribute('target').catch(() => null)
    console.log('Detail-page Download PDF target attr:', downloadControlTarget)

    // We already confirmed in the list-row test that this exact link
    // pattern uses target="_blank", opening yet another new tab where
    // the actual download fires. Handle both cases defensively rather
    // than assuming.
    let download
    if (downloadControlTarget === '_blank') {
      const [downloadPopup] = await Promise.all([
        detailPage.waitForEvent('popup', { timeout: 10000 }),
        downloadControl.click(),
      ])
      download = await downloadPopup.waitForEvent('download', { timeout: 15000 })
    } else {
      ;[download] = await Promise.all([
        detailPage.waitForEvent('download', { timeout: 15000 }),
        downloadControl.click(),
      ])
    }

    await assertIsRealPdf(download, 'detail-page')
  })
})