# TODO - Stock Out Feature

- [x] Implement backend endpoint: `POST /api/inventory/items/:id/stock-out`
  - [x] Add route in `backend/routes/inventory.js` restricted to inventory role only
  - [x] Implement controller method in `backend/controllers/inventoryController.js`
  - [x] Validation: quantity > 0 and <= current stock; reason required
  - [x] Update `inventory_items.current_stock`
  - [x] Insert into `inventory_transactions` with transaction_type='stock_out', job_order_id=null, remarks=`reason + ': ' + remarks`, performed_by=req.user.id
  - [x] If new_stock <= minimum_stock, insert low stock notification into `public.notifications` for inventory users

- [x] Implement frontend
  - [x] Update `frontend/pages/inventory/index.js` actions column: add “- Use Stock” next to “+ Add Stock”
  - [x] Add Stock Out modal (same styling/structure as Add Stock modal)
  - [x] Modal fields: Item name readonly, Current stock readonly, Quantity input, Reason dropdown, Remarks input, Save button
  - [x] Frontend validation and toast error handling (“Insufficient stock” if qty exceeds current stock)
  - [x] Call backend endpoint and on success show toast:
    - "Stock updated. {item_name} now has {new_stock} {unit} remaining."
  - [x] Close modal and refresh inventory list after successful deduction

