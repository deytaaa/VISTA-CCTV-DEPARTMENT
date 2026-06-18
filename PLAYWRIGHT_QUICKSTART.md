# Quick Start: Playwright E2E Tests

## 🚀 Quick Setup

```bash
# 1. Install dependencies (from frontend directory)
cd frontend
npm install

# 2. Install Playwright browsers
npx playwright install

# 3. Start the application (in separate terminal)
npm run dev
```

## ✅ Run All Tests

```bash
# From frontend directory
npm test
```

## 🧪 Run Specific Tests

```bash
npm run test:auth        # Login & access control tests
npm run test:admin       # Admin dashboard tests
npm run test:technician  # Technician workflow tests
npm run test:inventory   # Inventory management tests
```

## 🎯 Interactive Mode (Recommended for Development)

```bash
npm run test:ui
```

This opens the Playwright Inspector where you can:
- See tests run in real-time
- Step through each action
- Inspect page elements
- Debug locators

## 🐛 Debug Mode

```bash
npm run test:debug
```

Step through tests with the Playwright Inspector open.

## 📊 View Test Report

After tests complete:
```bash
npm run test:report
```

Opens HTML report with:
- Test results summary
- Screenshots of failures
- Video recordings (on failure)
- Detailed timing information

## 🔑 Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@gmail.com | admin123 |
| Technician | technician@gmail.com | technician123 |
| Inventory | inventory@gmail.com | inventory123 |

## 📝 Test Coverage

| File | Tests | Purpose |
|------|-------|---------|
| auth.spec.js | 5 | Login & access control |
| admin.spec.js | 6 | Admin operations (JO, users) |
| technician.spec.js | 7 | Technician workflow |
| inventory.spec.js | 7 | Inventory management |
| **Total** | **25** | **Full application coverage** |

## ⚙️ Configuration

### Change Test URL

```bash
# Unix/Linux/Mac
BASE_URL=http://localhost:4000 npm test

# Windows PowerShell
$env:BASE_URL="http://localhost:4000"; npm test

# Windows Command Prompt
set BASE_URL=http://localhost:4000 && npm test
```

### Adjust Test Timeout

Edit `playwright.config.js`:
```javascript
timeout: 45000, // Increase from 30 to 45 seconds
```

## 📸 Artifacts

Test results automatically saved to:
- **Screenshots**: `test-results/screenshots/` (on failure)
- **Videos**: `test-results/` (on failure)
- **HTML Report**: `playwright-report/`

## 🎬 Run with Video Recording

```bash
npx playwright test --config playwright.config.js --project=chromium
```

## 🔍 Test Specific Scenario

```bash
# Run single test by name (partial match)
npx playwright test -g "Login as admin"

# Run tests matching regex
npx playwright test -g "should show"

# Run specific file
npx playwright test admin.spec.js
```

## 💻 Different Browsers

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## 📋 Troubleshooting

| Issue | Solution |
|-------|----------|
| Tests timeout | Increase timeout in config or check if app is running |
| "Cannot find element" | Run with `--debug` to inspect selectors |
| Login fails | Verify credentials match seed scripts |
| Port in use | Set different `BASE_URL` |
| Playwright not found | Run `npm install` first |

## 📚 Useful Commands Cheatsheet

```bash
# Install & setup
npm install                        # Install dependencies
npx playwright install            # Install browsers

# Run tests
npm test                           # All tests
npm run test:ui                   # Interactive mode
npm run test:debug                # Debug mode
npx playwright test -g "login"    # Specific test

# View results
npm run test:report               # HTML report
npx playwright show-report        # Show last report

# Single browser
npx playwright test --project=chromium
```

## 🔗 Resources

- [Playwright Docs](https://playwright.dev)
- [Playwright API](https://playwright.dev/docs/api/class-page)
- [Test Best Practices](https://playwright.dev/docs/best-practices)
- [Full Test README](./tests/README.md)

---

**For detailed information, see [tests/README.md](./tests/README.md)**
