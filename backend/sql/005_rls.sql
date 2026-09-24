-- Row Level Security for VISTA CCTV Job Order System
-- Run AFTER 000_schema.sql .. 004_inventory.sql
--
-- WHY THIS EXISTS
-- The frontend ships the Supabase anon key (it is public by design). Without
-- RLS, that key could read and write every table directly through PostgREST,
-- bypassing the Express API and all of its role checks entirely. Verified
-- before this migration: an unauthenticated caller holding only the anon key
-- could list every user's email and role, read every job order, and issue a
-- successful PATCH against job_orders.
--
-- MODEL
-- * The backend uses the service_role key, which bypasses RLS. Every policy
--   below therefore constrains only the browser (anon / authenticated).
-- * anon gets NO policies anywhere -> anonymous access is denied outright.
-- * authenticated gets read access scoped to what the UI genuinely needs, and
--   write access ONLY to a user's own notifications. Every other write still
--   has to go through the API.
--
-- Re-runnable: policies are dropped before being recreated.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- SECURITY DEFINER so a policy ON public.users can call this without
-- recursing into that same policy (which would error at query time).
create or replace function public.current_app_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

revoke all on function public.current_app_role() from public;
grant execute on function public.current_app_role() to authenticated;

-- Can the current user see this job order at all? Admins see everything;
-- everyone else only the JOs they sent or were assigned.
create or replace function public.can_read_job_order(p_job_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.job_orders jo
    where jo.id = p_job_order_id
      and (
        public.current_app_role() = 'admin'
        or jo.receiver_id = auth.uid()
        or jo.sender_id = auth.uid()
      )
  );
$$;

revoke all on function public.can_read_job_order(uuid) from public;
grant execute on function public.can_read_job_order(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- users — closes the email/role disclosure
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;

drop policy if exists users_select_self_or_admin on public.users;
create policy users_select_self_or_admin on public.users
  for select to authenticated
  using (id = auth.uid() or public.current_app_role() = 'admin');

-- No insert/update/delete policies: profile writes go through the API only.
-- (The handle_new_auth_user trigger is SECURITY DEFINER and is unaffected.)

-- ---------------------------------------------------------------------------
-- job_orders — read by owner/assignee/admin; all writes via the API
-- ---------------------------------------------------------------------------
alter table public.job_orders enable row level security;

drop policy if exists job_orders_select on public.job_orders;
create policy job_orders_select on public.job_orders
  for select to authenticated
  using (
    public.current_app_role() = 'admin'
    or receiver_id = auth.uid()
    or sender_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- Job order children — visible exactly when the parent JO is
-- (pages/jo/[id] and /jo/[id]/pdf embed all three from the browser)
-- ---------------------------------------------------------------------------
alter table public.job_order_items enable row level security;

drop policy if exists job_order_items_select on public.job_order_items;
create policy job_order_items_select on public.job_order_items
  for select to authenticated
  using (public.can_read_job_order(job_order_id));

alter table public.job_order_personnel enable row level security;

drop policy if exists job_order_personnel_select on public.job_order_personnel;
create policy job_order_personnel_select on public.job_order_personnel
  for select to authenticated
  using (public.can_read_job_order(job_order_id));

alter table public.completion_reports enable row level security;

drop policy if exists completion_reports_select on public.completion_reports;
create policy completion_reports_select on public.completion_reports
  for select to authenticated
  using (public.can_read_job_order(job_order_id));

-- ---------------------------------------------------------------------------
-- notifications — the one table the browser legitimately writes to
-- (NotificationDropdown marks read / deletes), always scoped to own rows
-- ---------------------------------------------------------------------------
alter table public.notifications enable row level security;

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists notifications_delete_own on public.notifications;
create policy notifications_delete_own on public.notifications
  for delete to authenticated
  using (user_id = auth.uid());

-- Inserts are server-side only (the API raises notifications).

-- ---------------------------------------------------------------------------
-- activity_logs — admin audit trail.
-- Non-admins may read entries for JOs they can already see, which keeps the
-- Technician dashboard's realtime refresh working without widening exposure.
-- ---------------------------------------------------------------------------
alter table public.activity_logs enable row level security;

drop policy if exists activity_logs_select on public.activity_logs;
create policy activity_logs_select on public.activity_logs
  for select to authenticated
  using (
    public.current_app_role() = 'admin'
    or (job_order_id is not null and public.can_read_job_order(job_order_id))
  );

-- ---------------------------------------------------------------------------
-- inventory — mirrors the API's read access (admin + inventory)
-- ---------------------------------------------------------------------------
alter table public.inventory_items enable row level security;

drop policy if exists inventory_items_select on public.inventory_items;
create policy inventory_items_select on public.inventory_items
  for select to authenticated
  using (public.current_app_role() in ('admin', 'inventory'));

alter table public.inventory_transactions enable row level security;

drop policy if exists inventory_transactions_select on public.inventory_transactions;
create policy inventory_transactions_select on public.inventory_transactions
  for select to authenticated
  using (public.current_app_role() in ('admin', 'inventory'));

-- Stock movements are written only by the API / RPCs.

-- ---------------------------------------------------------------------------
-- jo_number_sequences — RLS on, no policies: service_role only.
-- The browser must never be able to read or advance the JO counter.
-- ---------------------------------------------------------------------------
alter table public.jo_number_sequences enable row level security;

-- ---------------------------------------------------------------------------
-- Verification (optional): every table below should report rowsecurity = true
-- ---------------------------------------------------------------------------
-- select tablename, rowsecurity
-- from pg_tables
-- where schemaname = 'public'
-- order by tablename;
