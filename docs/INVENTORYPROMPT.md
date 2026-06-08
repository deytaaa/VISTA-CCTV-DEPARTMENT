Add a full Inventory Management module to the 
VISTA CCTV Department system.

DATABASE TABLES:

inventory_items
- id
- item_name
- description
- unit          ← pieces, meters, sets, rolls, etc.
- current_stock ← current available quantity
- minimum_stock ← threshold for low stock alert
- created_at
- updated_at

inventory_transactions
- id
- inventory_item_id  ← FK to inventory_items
- transaction_type   ← 'stock_in' or 'stock_out'
- quantity           ← how many added or used
- job_order_id       ← nullable FK, links to JO if stock_out
- remarks            ← reason or notes
- performed_by       ← FK to users
- created_at

USER ROLE:
Add new role 'inventory' to users table enum.

Inventory role access:
- Dashboard (inventory stats only)
- Inventory page (full access)
- Job Orders (view only — to see what items were used)
- Cannot create JOs
- Cannot approve JOs
- Cannot see Approval Queue
- Cannot see Activity Logs

INVENTORY SIDEBAR for inventory role:
- Dashboard
- Inventory
- Job Orders (view only)

PAGES TO CREATE:

1. INVENTORY PAGE — /inventory
Shows all inventory items in a table:

Columns:
Item Name | Unit | Current Stock | Min Stock | Status | Actions

Status badges:
- Green "In Stock" → current_stock > minimum_stock
- Yellow "Low Stock" → current_stock <= minimum_stock
- Red "Out of Stock" → current_stock = 0

Actions per row:
[ View History ] [ + Add Stock ] [ Edit ] [ Delete ]

Filter bar:
[ Search item name... ] [ Status ▾ ] [ Clear Filters ]

Add New Item button (top right):
Opens modal with:
- Item Name (required)
- Description
- Unit (dropdown: pieces, meters, sets, rolls, boxes)
- Current Stock (number input)
- Minimum Stock (number input — for low stock alert)
- Save button

2. ADD STOCK (Stock In):
When "+ Add Stock" is clicked open a modal:

- Item: [Item Name - readonly]
- Current Stock: [current quantity - readonly]
- Add Quantity: [number input - how many to add]
- Remarks: [text - e.g. "New delivery from supplier"]
- Save button

On save:
- Update inventory_items.current_stock += quantity
- Insert into inventory_transactions:
  transaction_type = 'stock_in'
  quantity = added amount
  performed_by = current user id
  remarks = entered remarks

Show success toast:
"Stock updated. [Item Name] now has [new total] [unit]."

3. ITEM HISTORY PAGE — /inventory/[id]
Shows all transactions for one item:

Header:
- Item Name, Unit, Current Stock, Min Stock

Transaction table:
Date | Type | Quantity | JO No. | Remarks | Done By
05/23/2026 | Stock In  | +50 | —           | New delivery | Admin
05/24/2026 | Stock Out | -2  | JO-2026-0001| CCTV Install | Admin

4. INVENTORY DASHBOARD CARDS:
Total Items | In Stock | Low Stock | Out of Stock

5. LOW STOCK ALERTS:
Show a warning banner on dashboard when 
any item is at or below minimum_stock:

"⚠ Low Stock Alert: CCTV Camera (3 remaining), 
   Network Cable (5m remaining)"

6. AUTO DEDUCT STOCK WHEN JO IS GENERATED:
When admin clicks Generate JO and the JO 
contains items that exist in inventory:

- Automatically deduct the quantity from inventory
- Insert inventory_transaction:
  transaction_type = 'stock_out'
  quantity = JO item quantity
  job_order_id = new JO id
  remarks = 'Used in JO-2026-XXXX'

If item stock is insufficient show warning:
"Warning: CCTV Camera only has 1 unit in stock 
but JO requires 2. Proceed anyway?"
[ Cancel ] [ Proceed Anyway ]

7. INVENTORY REPORT (optional):
Export inventory list and transaction history 
to Excel/CSV file.

NAVIGATION UPDATE:
Add "Inventory" to admin sidebar as well:
Admin sidebar:
- Dashboard
- Create JO
- Job Orders
- Approval Queue
- Archive
- Activity Logs
- Inventory  ← new

Inventory role sidebar:
- Dashboard
- Inventory
- Job Orders (view only)