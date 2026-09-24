# VISTA CCTV Job Order System

VISTA CCTV is the City Government of Taguig CCTV Department’s job order management system for creating, assigning, tracking, approving, and completing service work.

## Folder Structure

- `backend/` — Express API, controllers, routes, SQL migrations, and seed scripts
- `frontend/` — Next.js web app UI, pages, components, and client-side logic
- `docs/` — Documentation and testing notes

## User Roles & Permissions

### Admin
- Manage users and technician assignments
- Create/update job orders (draft → sent; updates after dispatch)
- Review submitted completion proofs (approve/reject)
- Manage inventory items and stock
- View job logs/activity feed

### Technician
- Receive assigned job orders
- Mark job orders as processing
- Upload/submit signed JO proofs via the completion flow
- Submit completion for admin approval

### Inventory
- View job orders and inventory dashboards allowed by role checks
- Manage inventory stock levels (stock-in/out)
- Receive stock alert notifications from inventory-related transactions

> Note: Role checks are enforced server-side using `public.users.role` from Supabase.


## Quick Start

### Backend (Express)
```bash
cd backend
npm install
npm run dev
```

### Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```

## Database Setup (Supabase SQL Order)

Run in this order in the Supabase SQL editor:

1. `backend/sql/000_schema.sql`
2. `backend/sql/001_generate_jo_number.sql`
3. `backend/sql/002_remove_supervisor_role.sql`
4. `backend/sql/003_storage_bucket.sql`
5. `backend/sql/004_inventory.sql`
6. `backend/sql/005_rls.sql` — **required**; enables row level security
7. `backend/sql/006_fix_deduct_rpc_new_stock.sql`

### Soft-delete / filtering note
If your schema migration includes the soft-delete column, confirm `job_orders.deleted_at` exists and is used by the delete flow.

## Seed Scripts (Supabase)

These scripts use the backend’s Supabase service-role credentials.

### Prerequisites
- Create `backend/.env` with:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_KEY`

### Seed default users
```bash
cd backend
npm run seed-admin
npm run seed-technician
npm run seed:inventory
```

Seed scripts can be overridden via env vars (see each script for `SEED_*` keys).


## Environment Variables

Copy the templates and fill them in. Both targets are gitignored.

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

`backend/.env.example` and `frontend/.env.example` document every variable the
code reads, with defaults and the reason each one exists. The table below covers
what you must not get wrong.

### Backend (`backend/.env`)

| Variable | Required | Notes |
| --- | --- | --- |
| `SUPABASE_URL` | yes | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | yes | Service role key. Bypasses RLS — server-side only, never in the frontend |
| `PORT` | no | Defaults to 4000 |
| `TRUST_PROXY` | **in production** | Set to `1` on Render. Without it every request looks like it came from the proxy, so the rate limiters bucket all users together and real users throttle each other |
| `AUTH_CACHE_TTL_MS` | no | Session cache lifetime, default 30000. Set `0` to disable. A role change is observed up to this long after the fact on instances that did not handle the change |
| `AUTH_CACHE_MAX_ENTRIES` | no | Default 1000 |
| `RATE_LIMIT_BURST` | no | Per minute, default 300 |
| `RATE_LIMIT_SUSTAINED` | no | Per 15 minutes, default 2000 |
| `RATE_LIMIT_ACCOUNT` | no | Per 15 minutes, default 40. User writes and register only |
| `RATE_LIMIT_JO_GENERATE` | no | Per minute, default 30 |
| `RATE_LIMIT_UPLOAD` | no | Per 15 minutes, default 120 |
| `MAX_PROOF_UPLOAD_BYTES` | no | Default 5242880 (5MB); keep in step with the frontend's stated limit |
| `SEED_*`, `BACKFILL_TECHNICIAN_EMAIL` | no | Read only by the seed/backfill scripts |

### Frontend (`frontend/.env.local`)

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Public by design — inlined into the bundle. Its reach is governed entirely by RLS, so `005_rls.sql` must be applied |
| `NEXT_PUBLIC_API_URL` | yes | Backend origin, e.g. `http://localhost:4000` |

> `JWT_SECRET` was previously listed here. Nothing in the code reads it — the
> backend verifies Supabase-issued tokens via `supabase.auth.getUser()` rather
> than signing its own — so it has been removed to avoid implying it matters.

## Deployment

### Vercel (Frontend)
1. Deploy the `frontend` Next.js app.
2. Set env vars in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_API_URL` (point to Render-hosted backend URL)
3. Ensure proof bucket (`signed-jo-proofs`) allows public reads for proof files.

### Render (Backend)
1. Deploy the `backend` Express server.
2. Set env vars in Render:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `PORT` (if required by the service)
   - `TRUST_PROXY=1` — **required.** Render terminates TLS at a proxy, so
     without this every request carries the proxy's IP, all users share a
     single rate-limit bucket, and they throttle one another.
3. Confirm backend CORS allows the deployed frontend origin (current code uses permissive `cors()`).

## Features List
- Supabase Auth integration (frontend-driven login)
- Role-based access control (`admin`, `technician`, `inventory`)
- Job order lifecycle:
  - JO number generation (`/api/jo/generate` + DB function)
  - Draft save and sent submission
  - Processing and completion submission
  - Approval/rejection and archive state
- Signed proof upload to Supabase Storage bucket `signed-jo-proofs`
- Inventory management:
  - CRUD inventory items
  - Stock in/out (inventory transactions)
  - Stock preview during JO submission
- Activity logs and in-app notifications feed

## Security Notes (Pre-deploy Checklist)
- Do not expose `SUPABASE_SERVICE_KEY` to the frontend.
- Validate storage permissions:
  - `signed-jo-proofs` must be readable (public or via signed URLs) as intended.
  - Upload policy must be restricted to the authenticated role that performs proof uploads.
- Run `backend/sql/005_rls.sql`. Without it the public anon key can read and
  write every table directly through PostgREST, bypassing the API entirely.
- Rotate any seeded default passwords immediately after initial setup.
- Confirm that any “public read” requirements for proofs match your storage policy.

