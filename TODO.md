# TODO

- [ ] Add client-side CSV export button on `frontend/pages/inventory/index.js` next to "Add New Item".
- [ ] Implement `exportToCSV(rows, filename)` helper with proper CSV escaping (wrap values in double quotes; escape internal quotes).
- [ ] Export filtered table rows with columns: Item Name, Unit, Current Stock, Min Stock, Status.
- [ ] Filename: `inventory-report-{date}.csv` (date = YYYY-MM-DD).
- [ ] Add client-side CSV export button on `frontend/pages/inventory/[id].js` within the Transaction History section.
- [ ] Export transaction rows already loaded on the page with columns: Date, Type, Quantity, JO No., Remarks, Performed By.
- [ ] Filename: `inventory-history-{item_name}-{date}.csv` (item_name sanitized for filesystem).
- [ ] Manual sanity check: verify button placement, header names, quoting/commas, and that download triggers without API changes.

