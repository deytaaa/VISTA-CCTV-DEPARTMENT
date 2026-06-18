# TODO

## Playwright fixes (selectors + flaky navigation)
- [x] Insert full visible input attribute dump in failing modal tests:
  - [x] Admin: "Create a new technician user" modal (admin.spec.js)
  - [x] Admin: "Deactivate a user" modal (admin.spec.js)
  - [x] Inventory: "Add a new item..." modal (inventory.spec.js)
- [x] Prevent "page has been closed" around "Create User" click by accepting dialogs:
  - [x] Add `page.on('dialog', dialog => dialog.accept())` immediately before the "Create User" button click in both admin modal tests.

- [ ] Do not modify passing test: "Create a new JO" (admin.spec.js line ~25)
- [ ] Re-run Playwright tests to confirm the 3 previously failing tests now pass and no others regress.

