# Playwright End-to-End Tests for VISTA CCTV

This directory contains comprehensive Playwright end-to-end tests for the VISTA CCTV application.

## Test Files

### 1. **auth.spec.js** — Authentication & Access Control
Tests login flows and access restrictions:
- ✅ Login as admin with correct credentials → should reach /dashboard and see "Admin Console"
- ✅ Login as technician with correct credentials → should reach /dashboard and see "Technician Console"
- ✅ Login as inventory with correct credentials → should reach /dashboard and see "Inventory Dashboard"
- ✅ Login with wrong password → should show an error message
- ✅ Access /dashboard without logging in → should redirect to /login

### 2. **admin.spec.js** — Admin Dashboard Features
Tests admin functionality:
- ✅ Create a new JO with location, date, inventory item, and assigned technician → should show success toast with JO number
- ✅ View the created JO in Job Orders list → should appear in the table
- ✅ Go to Approval Queue → should show JOs submitted for approval
- ✅ Go to User Management → should show users table with Name, Email, Role, Status columns
- ✅ Create a new technician user → should appear in the users list
- ✅ Deactivate a user → should show Inactive badge

### 3. **technician.spec.js** — Technician Workflow
Tests technician operations:
- ✅ Login as technician → should see Assigned Work on dashboard
- ✅ Go to Job Orders → should show the assigned JO table
- ✅ Click View on a Sent JO → should open JO detail page
- ✅ Mark as Processing → status should update to Processing
- ✅ Upload proof image and add completion remarks → click Save Proof → should show success toast
- ✅ Click Submit for Approval → status should change to For Approval
- ✅ Go to Approved sidebar page → should only show Approved JOs

### 4. **inventory.spec.js** — Inventory Management
Tests inventory operations:
- ✅ Login as inventory → should see Inventory Dashboard with stats cards
- ✅ Go to Inventory page → should show items table
- ✅ Add a new item with name, unit, current stock, and minimum stock → should appear in table
- ✅ Click Add Stock on an item → enter quantity and remarks → should update current stock
- ✅ Click Use Stock on an item → enter quantity and reason → should deduct from current stock
- ✅ Export CSV → should trigger file download
- ✅ Go to item View History → should show transaction history table

## Test Credentials

```
Admin:       admin@gmail.com / admin123
Technician:  technician@gmail.com / technician123
Inventory:   inventory@gmail.com / inventory123
```

## Setup & Installation

1. **Install dependencies** (if not already installed):
   ```bash
   cd frontend
   npm install
   ```

2. **Ensure Playwright browsers are installed**:
   ```bash
   npx playwright install
   ```

3. **Create test-results directory** (for screenshots/videos):
   ```bash
   mkdir -p test-results/screenshots
   ```

## Running the Tests

### Run all tests:
```bash
npx playwright test
```

### Run tests in a specific file:
```bash
npx playwright test auth.spec.js
npx playwright test admin.spec.js
npx playwright test technician.spec.js
npx playwright test inventory.spec.js
```

### Run a specific test:
```bash
npx playwright test auth.spec.js -g "Login as admin"
```

### Run tests with UI mode (interactive):
```bash
npx playwright test --ui
```

### Run tests in debug mode:
```bash
npx playwright test --debug
```

### Run tests with specific browser:
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Run tests with verbose output:
```bash
npx playwright test --reporter=verbose
```

## Configuration

### Environment Variables

Set `BASE_URL` to control where tests run (default: `http://localhost:3000`):

```bash
# Unix/Linux/Mac
BASE_URL=http://localhost:3000 npx playwright test

# Windows (PowerShell)
$env:BASE_URL="http://localhost:3000"; npx playwright test

# Windows (Command Prompt)
set BASE_URL=http://localhost:3000 && npx playwright test
```

### Test Timeout

Default test timeout is **30 seconds** per test (configured in `playwright.config.js`).

To adjust globally, edit `playwright.config.js`:
```javascript
timeout: 30000, // 30 seconds
```

## Test Output & Reports

### HTML Report
After tests run, view the HTML report:
```bash
npx playwright show-report
```

### Screenshots & Videos
- Screenshots on failure: `test-results/screenshots/`
- Videos on failure: `test-results/`

### Console Output
- **Summary**: Shows passed/failed/skipped tests
- **Verbose**: Use `--reporter=verbose` for detailed output

## Troubleshooting

### Tests timeout
- Increase `timeout` in `playwright.config.js`
- Check if the application is running on the correct port
- Verify network connectivity

### Login fails
- Verify credentials in the seed scripts
- Check if the backend API is accessible
- Ensure session/cookie handling is working

### Selectors not found
Tests use flexible selectors (text, role, etc.) but may need adjustment if:
- UI text changes
- DOM structure changes
- Placeholder text changes

To debug selectors:
```bash
npx playwright test --debug
```

### Port already in use
If the app runs on a different port, update `BASE_URL`:
```bash
BASE_URL=http://localhost:5000 npx playwright test
```

## Best Practices

1. **Run tests in CI/CD**: Add tests to your GitHub Actions or CI pipeline
2. **Parallel execution**: Tests run in parallel by default (use `--workers=1` to disable)
3. **Retry logic**: Tests auto-retry on CI (configured in `playwright.config.js`)
4. **Data cleanup**: Tests create test data with timestamps to avoid conflicts
5. **Screenshots on failure**: Automatically captured for debugging

## CI/CD Integration (GitHub Actions)

Add to `.github/workflows/e2e-tests.yml`:

```yaml
name: Playwright Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - name: Install dependencies
        run: cd frontend && npm install && npx playwright install
      - name: Run tests
        run: cd frontend && npx playwright test
        env:
          BASE_URL: http://localhost:3000
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: frontend/playwright-report/
          retention-days: 30
```

## Contributing

When adding new tests:
1. Use descriptive test names
2. Add `beforeEach` hooks for setup
3. Add `afterEach` hooks for screenshots
4. Use `test.setTimeout()` for long-running operations
5. Use flexible selectors (text, role, etc.) for better maintainability

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright API Reference](https://playwright.dev/docs/api/class-page)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Test Reports](https://playwright.dev/docs/test-reporters)
