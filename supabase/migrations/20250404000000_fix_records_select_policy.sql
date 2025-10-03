-- Fix records SELECT policy to ensure users can see all their own records (public and private)

-- Drop existing select policy if exists
drop policy if exists "Records visible to owner or public" on public.records;

-- Create new select policy: users can see their own records (all visibility) OR public records from others
create policy "Records visible to owner or public" on public.records
  for select
  using (
    auth.uid() = profile_id  -- User can see ALL their own records (public + private)
    or visibility = 'public'  -- User can see public records from others
  );
