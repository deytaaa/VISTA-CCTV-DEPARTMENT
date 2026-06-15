-- Base schema for VISTA CCTV Job Order System (Supabase/PostgreSQL)
-- Run this first, then run 001_generate_jo_number.sql

create extension if not exists pgcrypto;

-- Enums
create type public.user_role as enum ('admin', 'technician', 'inventory');
create type public.jo_status as enum (
  'draft',
  'sent',
  'pending',
  'received',
  'processing',
  'completed',
  'for_approval',
  'approved',
  'rejected',
  'archived'
);

-- Users profile table linked to Supabase Auth
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role public.user_role not null default 'technician',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- Auto-create profile rows from Supabase Auth signups.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_name text;
  fallback_name text;
begin
  raw_name := coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name');
  fallback_name := split_part(coalesce(new.email, 'User'), '@', 1);

  insert into public.users (id, name, email, role)
  values (
    new.id,
    coalesce(nullif(trim(raw_name), ''), fallback_name),
    new.email,
    'technician'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

-- Main Job Order table
create table if not exists public.job_orders (
  id uuid primary key default gen_random_uuid(),
  jo_number text unique,
  date date not null,
  location text not null,
  requestor_name text,
  status public.jo_status not null default 'draft',
  sender_id uuid references public.users(id),
  receiver_id uuid references public.users(id),
  rejection_remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_job_orders_status on public.job_orders(status);
create index if not exists idx_job_orders_date on public.job_orders(date);
create index if not exists idx_job_orders_location on public.job_orders(location);
create index if not exists idx_job_orders_deleted_at on public.job_orders(deleted_at);

-- Table 1: Supplies and Equipment
create table if not exists public.job_order_items (
  id uuid primary key default gen_random_uuid(),
  job_order_id uuid not null references public.job_orders(id) on delete cascade,
  item_no integer not null check (item_no > 0),
  item_name text not null,
  reference_no text,
  quantity numeric(12,2) not null check (quantity > 0),
  created_at timestamptz not null default now(),
  unique(job_order_id, item_no)
);

create index if not exists idx_job_order_items_job_order_id on public.job_order_items(job_order_id);

-- Table 2: Personnel / Job Description
create table if not exists public.job_order_personnel (
  id uuid primary key default gen_random_uuid(),
  job_order_id uuid not null references public.job_orders(id) on delete cascade,
  personnel_no integer not null check (personnel_no > 0),
  name text not null,
  created_at timestamptz not null default now(),
  unique(job_order_id, personnel_no)
);

create index if not exists idx_job_order_personnel_job_order_id on public.job_order_personnel(job_order_id);

-- Completion reports (supports multiple submissions due to rejection/re-upload loop)
create table if not exists public.completion_reports (
  id uuid primary key default gen_random_uuid(),
  job_order_id uuid not null references public.job_orders(id) on delete cascade,
  remarks text,
  proof_file text not null,
  completed_by uuid not null references public.users(id),
  completed_at timestamptz not null default now()
);

create index if not exists idx_completion_reports_job_order_id on public.completion_reports(job_order_id);

-- Activity logs
create table if not exists public.activity_logs (
  id bigserial primary key,
  user_id uuid references public.users(id),
  action text not null,
  job_order_id uuid references public.job_orders(id) on delete set null,
  timestamp timestamptz not null default now()
);

create index if not exists idx_activity_logs_job_order_id on public.activity_logs(job_order_id);
create index if not exists idx_activity_logs_timestamp on public.activity_logs(timestamp desc);

-- Optional notification feed table (useful for in-app dropdown + Realtime)
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  job_order_id uuid references public.job_orders(id) on delete set null,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_id_created_at on public.notifications(user_id, created_at desc);

-- Shared updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_users_set_updated_at on public.users;
create trigger trg_users_set_updated_at
before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists trg_job_orders_set_updated_at on public.job_orders;
create trigger trg_job_orders_set_updated_at
before update on public.job_orders
for each row execute function public.set_updated_at();

-- Auto-log status changes for audit trail
create or replace function public.log_job_order_status_change()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.activity_logs(user_id, action, job_order_id, timestamp)
    values (
      new.sender_id,
      format('New Job Order %s has been assigned to you.', coalesce(new.jo_number, new.id::text)),
      new.id,
      now()
    );
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status is distinct from new.status then
    insert into public.activity_logs(user_id, action, job_order_id, timestamp)
    values (
      coalesce(new.sender_id, new.receiver_id),
      format('Status changed: %s -> %s', old.status, new.status),
      new.id,
      now()
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_job_orders_log_status_change on public.job_orders;
create trigger trg_job_orders_log_status_change
after insert or update on public.job_orders
for each row execute function public.log_job_order_status_change();

-- Soft delete helper
create or replace function public.soft_delete_job_order(p_job_order_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.job_orders
  set deleted_at = now()
  where id = p_job_order_id
    and deleted_at is null;

  insert into public.activity_logs(user_id, action, job_order_id, timestamp)
  values (p_user_id, 'Job Order soft deleted', p_job_order_id, now());
end;
$$;

-- Realtime publication (idempotent)
do $$
begin
  begin
    alter publication supabase_realtime add table public.job_orders;
  exception when duplicate_object then
    null;
  end;

  begin
    alter publication supabase_realtime add table public.completion_reports;
  exception when duplicate_object then
    null;
  end;

  begin
    alter publication supabase_realtime add table public.activity_logs;
  exception when duplicate_object then
    null;
  end;

  begin
    alter publication supabase_realtime add table public.notifications;
  exception when duplicate_object then
    null;
  end;
end
$$;
