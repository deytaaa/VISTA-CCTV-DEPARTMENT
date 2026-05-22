# VISTA CCTV Frontend (Next.js + Tailwind)

This is a starter Next.js app scaffold for the Job Order system.

Commands:

```bash
cd frontend
npm install
npm run dev
```

Notes:
- Install Tailwind and adjust `tailwind.config.js` as needed.
- Replace placeholder Supabase integration with real credentials in `lib/supabaseClient.js` (create it when ready).
Required environment variables (create a `.env.local`):

- `NEXT_PUBLIC_SUPABASE_URL` - your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon/public key
- `NEXT_PUBLIC_API_URL` - backend URL (e.g., http://localhost:4000)

Example:

```
NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=public-anon-key
NEXT_PUBLIC_API_URL=http://localhost:4000
```
