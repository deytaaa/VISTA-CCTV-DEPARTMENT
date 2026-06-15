# User Management Soft Delete (is_active)

## Steps
1. Update DB schema (backend/sql/000_schema.sql)
   - Add `public.users.is_active boolean NOT NULL DEFAULT true` if missing.
2. Update backend users controller
   - Modify `listUsers` to only return active users (is_active=true).
   - Replace `deleteUser` to soft-deactivate: set is_active=false and ban auth login.
   - Add `listInactiveUsers` (admin-only) to fetch deactivated users.
   - Add `reactivateUser` endpoint to set is_active=true and remove auth ban.
3. Update backend routes
   - Wire new endpoints for inactive listing + reactivation.
4. Update frontend users page
   - Change Delete button/modal text to “Deactivate”.
   - Main table shows only active users.
   - Add “Deactivated Users” section with Reactivate buttons.
5. Test
   - Verify deactivation hides user from main list.
   - Verify reactivation restores them.
   - Verify admin cannot deactivate themselves if desired by existing logic.

