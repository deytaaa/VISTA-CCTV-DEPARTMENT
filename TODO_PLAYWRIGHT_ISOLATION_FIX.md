# Fix Playwright admin.spec.js syntax error — RESOLVED 2026-09-23

- [x] Remove/move the misplaced top-level `await` block in `frontend/tests/admin.spec.js`.
- [x] Verify the file passes the syntax/parsing stage.

`node --check frontend/tests/admin.spec.js` is clean and the admin project runs as
part of the full suite (31/31 passing). No misplaced top-level `await` remains.
