-- Storage bucket and policies for signed JO proof uploads
-- Run this in Supabase SQL editor after ensuring the storage extension is available.

insert into storage.buckets (id, name, public)
values ('signed-jo-proofs', 'signed-jo-proofs', true)
on conflict (id) do update
set name = excluded.name,
    public = true;

-- Allow authenticated users to upload proof files.
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'authenticated users can upload signed jo proofs'
  ) then
    create policy "authenticated users can upload signed jo proofs"
    on storage.objects
    for insert
    to authenticated
    with check (bucket_id = 'signed-jo-proofs');
  end if;
end
$$;

-- Allow public read access to proof files.
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'public can read signed jo proofs'
  ) then
    create policy "public can read signed jo proofs"
    on storage.objects
    for select
    to public
    using (bucket_id = 'signed-jo-proofs');
  end if;
end
$$;
