create table if not exists public.mission_participants (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'joined' check (status in ('joined', 'left')),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  unique (mission_id, profile_id)
);

alter table public.mission_participants enable row level security;

create index if not exists mission_participants_mission_idx on public.mission_participants (mission_id);
create index if not exists mission_participants_profile_idx on public.mission_participants (profile_id);

-- Viewing allowed for crew members and mission participants
create policy "Mission participants view" on public.mission_participants
  for select
  using (
    auth.uid() = profile_id
    or exists (
      select 1 from public.missions m
      join public.crew_members cm on cm.crew_id = m.crew_id
      where m.id = mission_id and cm.profile_id = auth.uid()
    )
  );

-- Joining allowed for crew members
create policy "Mission participants join" on public.mission_participants
  for insert
  with check (
    auth.uid() = profile_id
    and exists (
      select 1 from public.missions m
      join public.crew_members cm on cm.crew_id = m.crew_id
      where m.id = mission_id and cm.profile_id = auth.uid()
    )
  );

-- Update allowed for participant or crew owner
create policy "Mission participants update" on public.mission_participants
  for update
  using (
    auth.uid() = profile_id
    or exists (
      select 1 from public.missions m
      join public.crews c on c.id = m.crew_id
      where m.id = mission_id and c.owner_id = auth.uid()
    )
  )
  with check (
    status in ('joined', 'left')
  );

-- Delete allowed for crew owner
create policy "Mission participants delete" on public.mission_participants
  for delete
  using (
    exists (
      select 1 from public.missions m
      join public.crews c on c.id = m.crew_id
      where m.id = mission_id and c.owner_id = auth.uid()
    )
  );
