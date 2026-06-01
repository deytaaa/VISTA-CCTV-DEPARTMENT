Inventory Role — Access Control
 Login as inventory role → should reach Inventory Dashboard - ✅   
 Inventory role cannot access Job Orders page → should show access denied - ✅
 Inventory role cannot access Approval Queue → should show access 
 denied - ✅
 Inventory role sidebar only shows Dashboard and Inventory - ✅

Inventory — Item Management
 Log in as inventory role - ✅    
 Add a new item with name, unit, current stock, and minimum stock → should appear in inventory list - ✅
 Edit an existing item → changes should save correctly - ✅
 Delete an item → should ask for confirmation before deleting - ✅
 Search for an item by name → should filter results correctly - ✅
 Filter items by status (In Stock / Low Stock / Out of Stock) → should filter correctly - ✅

Inventory — Stock Management
 Click Add Stock on an item → enter quantity and remarks → current stock should increase -✅
 Verify the Stock In transaction appears in the item's View History page - ✅
 Set an item's stock below minimum stock → Low Stock badge should appear - ✅
 Set an item's stock to 0 → Out of Stock badge should appear - ✅ 
 Verify low stock warning banner appears on inventory dashboard - ✅

Inventory — JO Auto Deduct
 Log in as admin and create a JO with an inventory item and quantity - ✅
 After JO is generated confirm the item's current stock decreased by the correct quantity - ✅
 Verify a Stock Out transaction appears in the item's View History linked to the JO number - ✅
 Create a JO with quantity exceeding available stock → should show insufficient stock warning - ✅
 Click Proceed Anyway on the warning → JO should still generate - ✅

Inventory — Transaction History
 Click View History on any item → should show all Stock In and Stock Out records - ✅
 Stock Out records should show the linked JO number - ✅
 Performed By column should show the correct user name - ✅
 Refreshing the history page should not show 401 errors in console - ✅