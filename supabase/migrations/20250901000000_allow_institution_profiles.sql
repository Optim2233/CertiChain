-- Allow anon + authenticated to manage institution-profiles bucket (public read already, but insert/update/delete need RLS)
-- Bucket was created via storage API as public, but default RLS blocks writes.

drop policy if exists "Public read institution-profiles" on storage.objects;
create policy "Public read institution-profiles"
on storage.objects for select
to anon, authenticated, service_role
using (bucket_id = 'institution-profiles');

drop policy if exists "Allow upload institution-profiles" on storage.objects;
create policy "Allow upload institution-profiles"
on storage.objects for insert
to anon, authenticated, service_role
with check (bucket_id = 'institution-profiles');

drop policy if exists "Allow update institution-profiles" on storage.objects;
create policy "Allow update institution-profiles"
on storage.objects for update
to anon, authenticated, service_role
using (bucket_id = 'institution-profiles')
with check (bucket_id = 'institution-profiles');

drop policy if exists "Allow delete institution-profiles" on storage.objects;
create policy "Allow delete institution-profiles"
on storage.objects for delete
to anon, authenticated, service_role
using (bucket_id = 'institution-profiles');
