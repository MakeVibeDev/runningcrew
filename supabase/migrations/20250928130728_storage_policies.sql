-- crew-assets public read, service role manage
create policy "Crew assets readable by anyone"
on storage.objects for select
using (
  bucket_id = 'crew-assets'
);

create policy "Crew assets manageable by service role"
on storage.objects for all
using (
  bucket_id = 'crew-assets' and auth.role() = 'service_role'
);

-- records-raw write by owner, read by service role
create policy "Records raw readable by service role"
on storage.objects for select
using (
  bucket_id = 'records-raw' and auth.role() = 'service_role'
);

create policy "Records raw inserted by authenticated users"
on storage.objects for insert
with check (
  bucket_id = 'records-raw' and auth.uid()::text = split_part(name, '/', 1)
);

create policy "Records raw deletable by service role"
on storage.objects for delete
using (
  bucket_id = 'records-raw' and auth.role() = 'service_role'
);