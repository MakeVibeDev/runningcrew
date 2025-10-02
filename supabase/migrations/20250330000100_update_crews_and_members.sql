-- Allow duplicate crew names, enforce unique slug, and introduce crew membership model

-- Drop unique constraint on crew name if it exists
alter table public.crews drop constraint if exists crews_name_key;

-- Ensure slug remains unique (defensive index in case original constraint removed)
create unique index if not exists crews_slug_unique_idx on public.crews (slug);

-- Add activity region column as required metadata
alter table public.crews add column if not exists activity_region text;
update public.crews set activity_region = coalesce(activity_region, '지역 미정') where activity_region is null;
alter table public.crews alter column activity_region set not null;

-- Crew membership table links profiles to crews with explicit role
create table if not exists public.crew_members (
  crew_id uuid not null references public.crews (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (crew_id, profile_id)
);

create index if not exists crew_members_profile_id_idx on public.crew_members (profile_id);

alter table public.crew_members enable row level security;

-- Members can view their own memberships
drop policy if exists "Crew membership visible to member" on public.crew_members;

create policy "Crew membership visible to member" on public.crew_members
  for select
  using (
    auth.uid() = profile_id
    or auth.uid() = (select owner_id from public.crews where id = crew_id)
  );

-- Members can manage their own membership rows (join/leave)
drop policy if exists "Crew membership self-manage" on public.crew_members;

create policy "Crew membership self-manage" on public.crew_members
  for all
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

-- Crew owners can manage membership records
drop policy if exists "Crew owner manage membership" on public.crew_members;

create policy "Crew owner manage membership" on public.crew_members
  for all
  using (auth.uid() = (select owner_id from public.crews where id = crew_id))
  with check (auth.uid() = (select owner_id from public.crews where id = crew_id));

-- Ensure crew owner_id automatically has a matching membership row via trigger placeholder (TODO: implement Edge Function)
