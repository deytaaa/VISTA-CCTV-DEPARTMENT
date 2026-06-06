# Notification delete fix - progress tracker

- [x] Updated `frontend/components/shared/NotificationDropdown.jsx` to handle delete failures by reverting UI via `loadNotifications()` and logging the error.
- [ ] Add Supabase RLS DELETE policy for `public.notifications` (run this in Supabase SQL editor; requires RLS enabled on the table):

  ```sql
  CREATE POLICY "Users can delete own notifications"
  ON public.notifications
  FOR DELETE
  USING (auth.uid() = user_id);
  ```


