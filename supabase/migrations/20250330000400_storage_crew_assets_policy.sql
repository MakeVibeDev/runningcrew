-- Allow authenticated users to manage files within crew-assets bucket

drop policy if exists "Crew assets insert" on storage.objects;
create policy "Crew assets insert" on storage.objects
  for insert
  with check (bucket_id = 'crew-assets');

drop policy if exists "Crew assets update" on storage.objects;
create policy "Crew assets update" on storage.objects
  for update
  using (bucket_id = 'crew-assets' and auth.uid() = owner)
  with check (bucket_id = 'crew-assets' and auth.uid() = owner);

drop policy if exists "Crew assets delete" on storage.objects;
create policy "Crew assets delete" on storage.objects
  for delete
  using (bucket_id = 'crew-assets' and auth.uid() = owner);

drop policy if exists "Crew assets select" on storage.objects;
create policy "Crew assets select" on storage.objects
  for select
  using (bucket_id = 'crew-assets');
