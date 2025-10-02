-- Fix profiles RLS policy to allow public viewing of basic profile info
-- This allows anyone to see display names and avatars (public information)

drop policy if exists "Profiles are self-viewable" on public.profiles;

-- Allow everyone to view basic profile info (display_name, avatar_url)
-- This is needed for showing participant names and avatars
create policy "Profiles are publicly viewable" on public.profiles
  for select
  using (true);
