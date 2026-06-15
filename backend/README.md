# VISTA CCTV Backend (Express)

Node/Express API for the VISTA CCTV Job Order System.

## Start Backend

```bash
cd backend
npm install
npm run dev
```

Backend listens on `PORT` (default `4000`).

## Middleware (How Auth/Role Works)

- `authMiddleware` (required for most protected routes)
  - Reads `Authorization: Bearer <token>`
  - Uses Supabase Admin SDK (`supabase.auth.getUser(token)`) to verify token
  - Loads user profile from `public.users`
  - Sets `req.user` with `role`

- `requireAnyRole([...])` / `isAdmin`
  - Enforces `req.user.role` server-side

## API Base Paths

All routes are mounted under:

- `/api/auth`
- `/api/jo`
- `/api/items`
- `/api/personnel`
- `/api/completion`
- `/api/approval`
- `/api/logs`
- `/api/job-orders`
- `/api/users`
- `/api/inventory`

## API Endpoints by Module

### Auth
- `POST /api/auth/login` — returns 501 (login is done via frontend Supabase auth)
- `POST /api/auth/register` — admin-style user creation (service role required)
- `GET /api/auth/me` — current user + profile
- `GET /api/auth/session` — session/profile inspection

### Job Orders (dispatch lifecycle)
- `GET /api/job-orders` — list job orders (blocked for `inventory` role)
- `GET /api/job-orders/:id` — get job order by id (blocked for `inventory` role)
- `POST /api/job-orders` — create job order (`admin`/`dispatcher`)
- `PUT /api/job-orders/:id` — update job order (`admin`/`dispatcher`)
- `DELETE /api/job-orders/:id` — soft delete job order (`admin`)
- `POST /api/job-orders/:id/processing` — mark as `processing` (`technician`, only if assigned + status `sent`)
- `POST /api/job-orders/:id/complete` — mark as `for_approval` (`technician`, only if assigned)

### Approvals
- `GET /api/approval` — list approval items
- `GET /api/approval/:id` — fetch approval/job order
- `POST /api/approval` — action-based update (approve/reject/request_approval)
- `PUT /api/approval/:id` — update approval/job order record

### Completion Reports
- `GET /api/completion?job_order_id=...` — list completion reports (optional filter)
- `GET /api/completion/:id` — fetch completion report
- `POST /api/completion` — create completion report (`admin`/`technician`)
- `PUT /api/completion/:id` — update completion report (`admin`/`technician`)

### Inventory
- `GET /api/inventory` — list inventory items (`admin`/`inventory`)
- `GET /api/inventory/items` — list inventory items (same as above)
- `GET /api/inventory/transactions/recent` — last transactions (`inventory`)
- `GET /api/inventory/items/:id` — get inventory item with details
- `POST /api/inventory` — create inventory item (`inventory`)
- `PUT /api/inventory/:id` — update inventory item (`inventory`)
- `DELETE /api/inventory/:id` — delete inventory item (`inventory`)
- `POST /api/inventory/items/:id/stock-out` — deduct stock via transaction
- `POST /api/inventory/items/:id/stock` — add stock via `inventory_stock_in` RPC
- `POST /api/inventory/preview-usage` — stock preview for JO submission (`admin`/`inventory`)

### Users (admin)
- `GET /api/users` — list users (`admin`)
- `POST /api/users` — create user (`admin`)
- `GET /api/users/technicians` — list technician dropdown (`admin`)
- `PUT /api/users/:id` — update user (`admin`)
- `POST /api/users/:id/reset-password` — reset password (`admin`)
- `DELETE /api/users/:id` — delete user (`admin`)

### Logs
- `GET /api/logs` — list activity logs
- `GET /api/logs/:id` — fetch activity log

### Items & Personnel
These modules are used by the Create/Update JO flow.

- `GET/POST/PUT/DELETE /api/items` and `GET/POST/PUT/DELETE /api/personnel` routes are mounted by `server.js` under `/api/items` and `/api/personnel`.

> If you need the exact payload fields for `items` and `personnel` routes, check the corresponding controllers:
> `backend/controllers/itemsController.js` and `backend/controllers/personnelController.js`.

## Environment Variables

Create `backend/.env`:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY` (server-side only)
- `JWT_SECRET` (present in current docs; used if you enable JWT issuance/verification)

## Database Setup Reference (Supabase SQL)

Run in this order in the Supabase SQL editor:

1. `backend/sql/000_schema.sql`
2. `backend/sql/001_generate_jo_number.sql`
3. `backend/sql/002_remove_supervisor_role.sql`
4. `backend/sql/003_storage_bucket.sql`
5. `backend/sql/004_inventory.sql`

## Seed Scripts (Supabase)

Seed scripts require `backend/.env`.

### Commands
```bash
cd backend

npm run seed-admin
npm run seed-technician
npm run seed:inventory
```

### Optional env overrides (supported by scripts)
- `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME`, `SEED_ADMIN_ROLE`
- `SEED_TECHNICIAN_EMAIL`, `SEED_TECHNICIAN_PASSWORD`, `SEED_TECHNICIAN_NAME`
- `SEED_INVENTORY_EMAIL`, `SEED_INVENTORY_PASSWORD`, `SEED_INVENTORY_NAME`

