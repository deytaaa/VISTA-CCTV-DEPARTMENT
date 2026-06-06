# TODO

## Users Management (/users) - Admin CRUD
- [x] Update backend: extend `backend/controllers/usersController.js` with admin CRUD handlers (list/create/update/reset/delete) using `supabase.auth.admin.*`.
- [x] Update backend routes: add `/api/users` GET/POST, `/api/users/:id` PUT/DELETE, `/api/users/:id/reset-password` POST; protect with auth middleware + admin-only.
- [x] Update frontend: add `/pages/users.js` admin-only page with table (Name, Email, Role, Created At), search + role filter, and modals (Create/Edit/Reset/Delete).

- [x] Update frontend sidebar: add Users link (/users) visible only to admin; add users/people icon mapping.

- [x] Ensure self-delete prevention: backend blocks delete if target id == admin id; frontend also blocks and shows error.

- [ ] Manual verification: run backend/frontend and validate CRUD flows.

