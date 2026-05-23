-- Migration: remove supervisor role from the system
-- Run after 000_schema.sql and before or alongside application deployment.

update public.users
set role = 'technician'
where role::text = 'supervisor';

create type public.user_role_new as enum ('admin', 'technician');

alter table public.users
  alter column role drop default,
  alter column role type public.user_role_new
  using role::text::public.user_role_new,
  alter column role set default 'technician';

drop type public.user_role;
alter type public.user_role_new rename to user_role;
