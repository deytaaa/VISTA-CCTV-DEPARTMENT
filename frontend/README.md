# VISTA CCTV Frontend (Next.js + Tailwind)

Next.js UI for the VISTA CCTV Job Order System.

## Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Project uses Next.js **14.2.33**.

## Tech Stack Notes

- Tailwind CSS is configured in `tailwind.config.js` and styles live in `styles/globals.css`.
- Authentication uses **Supabase** on the client (see `frontend/context/AuthContext.js`).

## Environment Variables

Create `frontend/.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL` — backend origin (e.g. `http://localhost:4000`)

## Deployment Notes

### Vercel
- Deploy the `frontend` Next.js app.
- Set the three env vars above in Vercel.
- Supabase Realtime note:
  - On Vercel, WebSocket connections can be unreliable depending on project configuration.
  - This app uses **Supabase Realtime with periodic polling (~30s)** as a fallback/strategy for notification updates.

### Render
- Deploy the backend separately; point `NEXT_PUBLIC_API_URL` to the deployed backend URL.

## Pages & Routes (by Role)

### Public / Shared
- `GET /` — redirects to role-based dashboard
- `GET /login` — Supabase sign-in
- `GET /access-denied` — unauthorized route
- `GET /reset-password` — Supabase reset flow

### Admin (dashboard + management)
- `GET /dashboard` — AdminDashboard (role-based)
- `GET /users` — user management
- `GET /logs` — activity logs
- Job Orders
  - `GET /jo` — JO list
  - `GET /jo/create` — create JO (draft + send)
  - `GET /jo/pending` — pending/for_approval view
  - `GET /jo/approved` — approved view
  - `GET /jo/archive` — archived view
  - `GET /jo/completed` — completed view
  - `GET /jo/:id/pdf` — generate/show JO PDF
  - `GET /jo/:id` — JO detail shell
- Inventory (read/write)
  - `GET /inventory` — inventory items list
  - `GET /inventory/[id]` — inventory item details + transactions

### Technician
- `GET /dashboard` — TechnicianDashboard (role-based)
- Job Orders
  - `GET /jo` — JO list filtered by technician assignment
  - `GET /jo/pending` / `/processing` / `/sent` / `/completed` — status views available in the UI
  - `GET /jo/create` is restricted (admin/dispatcher creation)
  - `GET /jo/:id/pdf` — proof/JO PDF
- Completion / Proof
  - Proof upload and completion submission are done via API calls from the JO pages.

### Inventory Role
- `GET /dashboard` — InventoryDashboard (role-based)
- Inventory pages
  - `GET /inventory` and `GET /inventory/[id]`
- JO submission preview
  - Inventory stock preview is used during JO “Generate/Send” flow.

## Tailwind Usage

- UI components use Tailwind utility classes.
- Layout and navigation are in `components/layout/*`.
- Role-protected rendering uses `components/ProtectedRoute.js` and `context/AuthContext.js`.

