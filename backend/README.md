# VISTA CCTV Backend (Express)

This is a minimal starter backend for the Job Order system.

Environment variables (development):

- `JWT_SECRET` - secret for signing JWTs
- `SUPABASE_URL`, `SUPABASE_KEY` - placeholders for production integration

Required environment variables for Supabase integration:

- `SUPABASE_URL` - your Supabase project URL
- `SUPABASE_SERVICE_KEY` - service role key (server-side only)

Create a `.env` file in `backend/` with these values for local development.

Scripts:

- `npm install` then `npm run dev` to start with nodemon (install globally if needed)

Endpoints:

- `GET /health` - health check
- `POST /api/jo/generate` - returns a generated JO number
	- Uses Supabase RPC `generate_jo_number()` when available (atomic, DB-backed)
	- Falls back to local file sequence for dev if RPC is missing
- `POST /api/jo/upload-proof` - accepts `file` multipart form upload and uploads to Supabase Storage bucket `signed-jo-proofs`

Notes:

Create the schema and DB function in Supabase SQL Editor in this order:

1. `backend/sql/000_schema.sql`
2. `backend/sql/001_generate_jo_number.sql`

After running both SQL files, test with:

- `POST /api/jo/generate` twice and verify incrementing values like `JO-2026-0001`, `JO-2026-0002`.
