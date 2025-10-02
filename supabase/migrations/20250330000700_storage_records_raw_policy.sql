-- Allow authenticated users to upload raw record images to records-raw bucket

drop policy if exists "Records raw insert" on storage.objects;
create policy "Records raw insert" on storage.objects
  for insert
  with check (
    bucket_id = 'records-raw'
    and auth.role() = 'authenticated'
    and auth.uid()::text = split_part(name, '/', 1)
  );

drop policy if exists "Records raw update" on storage.objects;
create policy "Records raw update" on storage.objects
  for update
  using (bucket_id = 'records-raw' and auth.uid() = owner)
  with check (
    bucket_id = 'records-raw'
    and auth.uid() = owner
    and auth.uid()::text = split_part(name, '/', 1)
  );

drop policy if exists "Records raw delete" on storage.objects;
create policy "Records raw delete" on storage.objects
  for delete
  using (bucket_id = 'records-raw' and auth.uid() = owner);

drop policy if exists "Records raw select" on storage.objects;
create policy "Records raw select" on storage.objects
  for select
  using (
    bucket_id = 'records-raw'
    and (auth.uid() = owner or auth.role() = 'service_role')
  );
