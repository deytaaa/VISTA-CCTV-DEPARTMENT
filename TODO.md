# TODO

- [ ] Add Supabase Realtime subscription to `frontend/pages/inventory/index.js` for `public.inventory_items` changes (event: '*'), calling `loadItems()` on any change.
- [ ] Add cleanup in the same `useEffect` to call `supabase.removeChannel(channel)`.
- [ ] Add Supabase Realtime subscription to `frontend/components/dashboard/InventoryDashboard.jsx` for `public.inventory_items` changes, re-fetching counts + low-stock items.
- [ ] Add cleanup in the dashboard `useEffect` to call `supabase.removeChannel(channel)`.
- [ ] Verify no lint/build errors; confirm realtime updates work on stock changes.

