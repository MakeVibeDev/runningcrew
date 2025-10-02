-- Allow public read access to crew_members for counting purposes
-- This allows anyone to see crew membership counts without exposing sensitive data

drop policy if exists "Crew members publicly viewable" on public.crew_members;

create policy "Crew members publicly viewable" on public.crew_members
  for select
  using (true);
