-- Enable required extensions
create extension if not exists "pgcrypto";

-- Profiles mirror Supabase auth.users entries
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url text,
  crew_role text not null default 'member' check (crew_role in ('member', 'admin')),
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Running crews
create table if not exists public.crews (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete restrict,
  name text not null unique,
  slug text not null unique,
  description text,
  intro text,
  logo_image_url text,
  location_lat numeric(9,6),
  location_lng numeric(9,6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crews_owner_id_idx on public.crews (owner_id);

-- OCR 결과 임시 저장
create table if not exists public.record_ocr_results (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null unique,
  raw_text text,
  distance_km numeric(6,2),
  duration_seconds integer,
  recorded_at timestamptz,
  confidence numeric(3,2) check (confidence between 0 and 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists record_ocr_results_profile_id_idx on public.record_ocr_results (profile_id);

-- Missions belong to a crew and define a running objective
create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references public.crews (id) on delete cascade,
  title text not null,
  description text,
  start_date date not null,
  end_date date not null,
  target_distance_km numeric(6,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mission_dates_valid check (start_date <= end_date)
);

create index if not exists missions_crew_id_idx on public.missions (crew_id, start_date, end_date);

-- Records capture individual participation results for a mission
create table if not exists public.records (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  mission_id uuid not null references public.missions (id) on delete cascade,
  ocr_result_id uuid references public.record_ocr_results (id) on delete set null,
  recorded_at timestamptz not null,
  distance_km numeric(6,2) not null check (distance_km > 0),
  duration_seconds integer not null check (duration_seconds > 0),
  pace_seconds_per_km integer,
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  notes text,
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists records_mission_id_idx on public.records (mission_id);
create index if not exists records_profile_id_idx on public.records (profile_id);
create index if not exists records_visibility_idx on public.records (visibility);

-- Enable RLS and define baseline policies
alter table public.profiles enable row level security;
alter table public.crews enable row level security;
alter table public.record_ocr_results enable row level security;
alter table public.missions enable row level security;
alter table public.records enable row level security;

create policy "Profiles are self-viewable" on public.profiles
  for select
  using (auth.uid() = id);

create policy "Profiles are self-updatable" on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Crews are publicly readable" on public.crews
  for select
  using (true);

create policy "Crew owner manage" on public.crews
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "OCR results visible to owner" on public.record_ocr_results
  for select
  using (auth.uid() = profile_id or auth.role() = 'service_role');

create policy "OCR results updatable by owner" on public.record_ocr_results
  for update
  using (auth.uid() = profile_id or auth.role() = 'service_role')
  with check (auth.uid() = profile_id or auth.role() = 'service_role');

create policy "OCR results insert via Edge" on public.record_ocr_results
  for insert
  with check (auth.uid() = profile_id or auth.role() = 'service_role');

create policy "Missions are publicly readable" on public.missions
  for select
  using (true);

create policy "Crew owner manage missions" on public.missions
  for all
  using (auth.uid() = (select owner_id from public.crews where id = missions.crew_id))
  with check (auth.uid() = (select owner_id from public.crews where id = missions.crew_id));

create policy "Records visible to owner or public" on public.records
  for select
  using (auth.uid() = profile_id or visibility = 'public');

create policy "Records manageable by owner" on public.records
  for all
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);
