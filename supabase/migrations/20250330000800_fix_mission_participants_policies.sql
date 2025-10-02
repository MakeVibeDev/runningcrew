-- Fix mission_participants RLS policies to allow public viewing
-- This allows anyone to see participant counts (public information)

drop policy if exists "Mission participants view" on public.mission_participants;

-- Allow everyone to view mission participants (needed for participant counts)
create policy "Mission participants view" on public.mission_participants
  for select
  using (true);

-- Keep other policies as they are (insert/update/delete still restricted)
