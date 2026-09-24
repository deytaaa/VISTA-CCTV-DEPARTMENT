# User Management Soft Delete (is_active) — RESOLVED 2026-09-23

Implemented, but in a different shape than the original plan below. The plan
called for hiding inactive users from the main list and adding a separate
"Deactivated Users" section. What was actually built is a single table with a
Status filter (All / Active / Inactive) and an inline Reactivate action, which
covers the same need with less UI.

## Status of the original steps
1. [x] `public.users.is_active boolean NOT NULL DEFAULT true` exists (000_schema.sql).
2. [~] Backend users controller
   - `listUsers` intentionally returns ALL users; the UI filters by status.
   - [x] `deleteUser` soft-deactivates (is_active=false) and bans the auth login.
   - [x] `listInactiveUsers` and `reactivateUser` exist.
3. [x] Routes wired.
4. [~] Frontend users page — "Deactivate" wording, Status filter, inline Reactivate.
       No separate section; superseded by the filter.
5. [x] Verified by `frontend/tests/admin.spec.js` (deactivate -> Inactive badge).

## Leftovers removed 2026-09-23
The unused remnants of the original "separate section" design were deleted:
- `inactiveUsers` / `inactiveLoading` / `inactiveError` state in `pages/users.js`
  (declared, never rendered).
- `GET /api/users/inactive` + `usersController.listInactiveUsers`
  (never called by the frontend).
