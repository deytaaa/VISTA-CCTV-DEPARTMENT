## TODO - NotificationDropdown fix

- [ ] Inspect NotificationDropdown.jsx for the incorrect Supabase query usage causing `TypeError: query.from is not a function`.
- [ ] Fix the code to use Supabase query builder correctly (use the built query directly; remove erroneous `.from('notifications')` chaining).
- [ ] Ensure inventory-role unread count logic still works as intended.
- [ ] Run frontend lint/build (if available) or at least run `npm test`/`npm run build` for verification.

