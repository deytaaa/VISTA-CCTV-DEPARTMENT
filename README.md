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

### Backend (`backend/.env`)
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_KEY` — Supabase service role key (server-side only)
- `JWT_SECRET` — JWT signing secret (if you enable JWT issuance/verification)

### Frontend (`frontend/.env.local`)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL` — backend origin (example: `http://localhost:4000`)

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
- Ensure RLS policies are correct for tables that are queried client-side (if any use client keys).
- Rotate any seeded default passwords immediately after initial setup.
- Confirm that any “public read” requirements for proofs match your storage policy.

