# Notification Dropdown Debug - Inventory "No recent activity"

## Step 1: Verify notifications rows in Supabase
- Open Supabase SQL editor.
- Confirm rows exist in `public.notifications` with `user_id = <inventory_user_id>`.
- Run a query similar to:
  - `select id, user_id, message, is_read, created_at from public.notifications where user_id = '<id>' order by created_at desc limit 50;`
- Also check inventory messages use the expected prefixes:
  - `📦`, `Low Stock Alert:`, `❌ Out of Stock:`, `⚠ Low Stock:`

## Step 2: Log what NotificationDropdown is querying (DONE)
- In `frontend/components/shared/NotificationDropdown.jsx`, console logs were added:
  - Logs the `user.id` and role used for filtering.
  - Logs the raw Supabase query result (`data`) and `unreadResult`.
- Run the frontend and open the browser console to see:
  - If `user.id` matches the `user_id` stored in notifications.
  - If `data` is an empty array.

## Step 3: Check mismatch between auth id vs profile user id
- Confirm how inventory user id is selected during insertion:
  - `backend/controllers/jobOrderController.js` inserts notifications using `users.id` where `role = 'inventory'`.
- Validate that the inventory dropdown is using the same `user.id` from the frontend AuthContext.
- Investigate whether AuthContext’s `user` is auth user id or profile id.
- If mismatch is found, adjust insertion or dropdown filtering to use the correct id.

## Step 4: Reproduce
- Create/send a job order that triggers low stock.
- After creation, re-check Supabase `notifications` table and compare to dropdown logs.

