-- Atomic JO number generation for Supabase/PostgreSQL
-- Format: JO-YYYY-XXXX (sequence resets yearly)

create table if not exists public.jo_number_sequences (
  year integer primary key,
  last_value integer not null default 0,
  updated_at timestamptz not null default now()
);

-- Ensure job_orders.jo_number remains collision-free at DB level.
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'job_orders'
  ) then
    if not exists (
      select 1
      from pg_constraint
      where conname = 'job_orders_jo_number_key'
    ) then
      alter table public.job_orders
      add constraint job_orders_jo_number_key unique (jo_number);
    end if;
  end if;
end
$$;

create or replace function public.generate_jo_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year integer := extract(year from now())::integer;
  v_next integer;
begin
  insert into public.jo_number_sequences(year, last_value)
  values (v_year, 1)
  on conflict (year)
  do update
    set last_value = public.jo_number_sequences.last_value + 1,
        updated_at = now()
  returning last_value into v_next;

  return format('JO-%s-%s', v_year, lpad(v_next::text, 4, '0'));
end;
$$;

revoke all on function public.generate_jo_number() from public;
grant execute on function public.generate_jo_number() to anon, authenticated, service_role;
