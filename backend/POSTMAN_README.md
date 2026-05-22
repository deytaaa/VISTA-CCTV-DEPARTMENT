Postman collection for VISTA CCTV Backend

How to use

1. Ensure the backend is running locally (default port 4000):

```powershell
cd backend
npm install
npm run dev
```

2. Seed an admin user (requires `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` in env):

```powershell
cd backend
setx SUPABASE_URL "https://your-supabase-url"
setx SUPABASE_SERVICE_KEY "your-service-role-key"
setx SEED_ADMIN_EMAIL "admin@local.test"
setx SEED_ADMIN_PASSWORD "ChangeMe123!"
npm run seed-admin
```

3. Import `postman_collection.json` into Postman.

4. Set the collection/environment variables:
- `baseUrl` — e.g. `http://localhost:4000`
- `token` — a JWT for an authenticated user (the collection includes auth header placeholders). For manual testing you can skip protected endpoints or set `token` to a valid JWT.

Quick curl examples

Generate JO number:

```powershell
curl -X POST http://localhost:4000/api/jo/generate
```

Create job order (example):

```powershell
curl -X POST http://localhost:4000/api/job-orders -H "Content-Type: application/json" -d '{"location":"Main Hall","requestor_name":"John"}'
```

Notes
- Protected endpoints require a valid `Authorization: Bearer <token>` header. The recommended flow is to use Supabase Auth on the frontend and copy the session JWT into the `token` variable for Postman testing.
- The seed script uses the Supabase Admin API and requires a service-role key. Do not commit that key.
