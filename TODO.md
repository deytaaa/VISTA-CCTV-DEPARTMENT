- [ ] Inspect current login flow in frontend/pages/login.js
- [ ] Create plan to wait for Supabase auth session confirmation before router.push('/dashboard')
- [x] Implement fix using supabase.auth.onAuthStateChange (or getSession polling) in handleSubmit

- [x] Update any cleanup logic to avoid memory leaks (unsubscribe listener)

- [x] Quick sanity check: ensure redirect occurs only when session is confirmed

- [ ] Run frontend lint/build (optional)
