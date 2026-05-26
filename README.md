# VISTA CCTV Job Order System

VISTA CCTV is the City Government of Taguig CCTV Department's job order management system for creating, assigning, tracking, and approving service work for CCTV operations and related field work. It combines a Node/Express backend with a Next.js + Tailwind frontend.

## User Roles

- Admin: manages job orders, reviews uploaded proofs, approves or rejects completed work, and oversees system records.
- Technician: receives assigned job orders, updates progress, uploads proof of completion, and submits work for approval.

## Quick Start

- Start the backend:

```bash
cd backend
npm install
npm run dev
```

- Start the frontend:

```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

- Backend: create `backend/.env` with:

```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
```

- Frontend: create `frontend/.env.local` with:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

Replace placeholder Supabase configuration and secure secrets before deploying to production.

## Database setup (Supabase SQL Editor)

1. Run `backend/sql/000_schema.sql` to create tables, enums, and triggers.
2. Run `backend/sql/001_generate_jo_number.sql` to create the `generate_jo_number()` function.
3. Run `backend/sql/002_remove_supervisor_role.sql` if you need the role cleanup migration.
4. Run `backend/sql/003_storage_bucket.sql` to create the public proof bucket and storage policies.
5. After that, `POST /api/jo/generate` uses the DB-side JO number generator.

## Test Credentials

The seed scripts create these default accounts unless you override them with environment variables:

- Admin seed script: `backend/scripts/seed-admin.js`
	- Email: `manueldata1@gmail.com`
	- Password: `ChangeMe123!`
	- Role: `admin`
- Technician seed script: `backend/scripts/seed-technician.js`
	- Email: `vhon@gmail.com`
	- Password: `vhon123`
	- Role: `technician`

Both scripts also create or update the corresponding profile rows in the `users` table.

## Deployment Notes

- Backend: set `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` in `backend/.env`, install dependencies with `cd backend && npm install`, then run `npm run dev` for local development or your production start command on the host platform.
- Frontend: set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_API_URL` in `frontend/.env.local`, install dependencies with `cd frontend && npm install`, then run `npm run dev` locally or build with `npm run build` before deploying.
- Supabase: run the SQL scripts in order after any schema change, and verify the `signed-jo-proofs` storage bucket exists and is publicly readable for proof previews.
- Production: keep service-role keys server-side only and configure the frontend API URL to point at the deployed backend.

## Folder structure

Top-level layout of this workspace:

```
README.md
backend/
	server.js
	package.json
	README.md
	postman_collection.json
	jo-sequence.json
	controllers/
		approvalController.js
		authController.js
		completionController.js
		itemsController.js
		jobOrderController.js
		logsController.js
		personnelController.js
		usersController.js
	lib/
		supabase.js
	middleware/
		auth.js
		roleMiddleware.js
	routes/
		approval.js
		auth.js
		completion.js
		items.js
		jo.js
		job-orders.js
		logs.js
		personnel.js
		users.js
	scripts/
		backfill-job-order-receiver.js
		seed-admin.js
		seed-technician.js
	sql/
		000_schema.sql
		001_generate_jo_number.sql
		002_remove_supervisor_role.sql
		003_storage_bucket.sql

frontend/
	package.json
	next.config.js
	postcss.config.js
	tailwind.config.js
	README.md
	components/
		ProtectedRoute.js
		dashboard/
			AdminDashboard.jsx
			StatCard.jsx
			TechnicianDashboard.jsx
		jo/
			ApprovalQueuePage.jsx
			ArchiveListPage.jsx
			JODocument.jsx
			JOListPage.jsx
			JOStatusBadge.jsx
		layout/
			Header.jsx
			Layout.jsx
			Sidebar.jsx
		logs/
			ActivityLogsPage.jsx
		pdf/
			JODocument.jsx
		shared/
			NotificationDropdown.jsx
	context/
		AuthContext.js
	lib/
		supabaseClient.js
	pages/
		_app.js
		access-denied.js
		create-jo.js
		dashboard.js
		index.js
		login.js
		logs.js
		reset-password.js
		jo/
			approval.js
			archive.js
			completed.js
			create.js
			index.js
			pending.js
			processing.js
			sent.js
			[id]/
				index.js
				pdf.js
	public/
		images/
	styles/
		globals.css

```

## Key files and notes

- API entry: `backend/server.js` (starts Express and mounts routes).
- Frontend entry: `frontend/pages/_app.js` (Next.js app wrapper).
- Supabase helpers: `backend/lib/supabase.js` and `frontend/lib/supabaseClient.js`.
- Important scripts: `backend/scripts/seed-admin.js` and `backend/scripts/seed-technician.js` for seeding test accounts.

## Notes

- Double-check Supabase keys and storage bucket permissions before deploying.
- If you update DB schema, rerun the SQL scripts in the order above.

