# VISTA CCTV Job Order System

This workspace contains two folders: `backend` (Express) and `frontend` (Next.js + Tailwind).

Start locally:

- Backend: `cd backend && npm install && npm run dev`
- Frontend: `cd frontend && npm install && npm run dev`

Replace placeholder Supabase configuration and secure secrets before deploying to production.
Environment variables:

- Backend: create `backend/.env` with `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`.
- Frontend: create `frontend/.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_API_URL`.

Database setup (run in Supabase SQL Editor):

- Run `backend/sql/000_schema.sql` first to create tables/enums/triggers.
- Then run `backend/sql/001_generate_jo_number.sql` to create `generate_jo_number()`.
- `POST /api/jo/generate` will then use atomic DB-side JO number generation.
