-- Create storage buckets for the application

-- Bucket for crew logos and branding assets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'crew-assets',
  'crew-assets',
  true, -- publicly accessible
  5242880, -- 5MB
  array['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
on conflict (id) do nothing;

-- Bucket for raw running record images (screenshots from apps/watches)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'records-raw',
  'records-raw',
  false, -- private, access controlled by RLS
  5242880, -- 5MB
  array['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
on conflict (id) do nothing;
