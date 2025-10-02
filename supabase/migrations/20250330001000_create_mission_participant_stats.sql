-- Create table for storing aggregated mission statistics per participant
-- This table will be automatically updated via triggers when records are inserted/updated/deleted

create table if not exists public.mission_participant_stats (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  total_records integer not null default 0,
  total_distance_km numeric(10,2) not null default 0,
  total_duration_seconds integer not null default 0,
  avg_pace_seconds_per_km integer,
  first_activity_at timestamptz,
  last_activity_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (mission_id, profile_id)
);

-- Create indexes for faster lookups
create index if not exists mission_participant_stats_mission_idx on public.mission_participant_stats (mission_id);
create index if not exists mission_participant_stats_profile_idx on public.mission_participant_stats (profile_id);

-- Enable RLS
alter table public.mission_participant_stats enable row level security;

-- Allow everyone to view stats (public information)
create policy "Mission participant stats are publicly viewable" on public.mission_participant_stats
  for select
  using (true);

-- Only allow system triggers to insert/update/delete
create policy "Mission participant stats managed by system" on public.mission_participant_stats
  for all
  using (false);

-- Function to recalculate stats for a specific mission participant
create or replace function public.recalculate_mission_participant_stats(
  p_mission_id uuid,
  p_profile_id uuid
)
returns void
language plpgsql
security definer
as $$
declare
  v_total_records integer;
  v_total_distance numeric(10,2);
  v_total_duration integer;
  v_avg_pace integer;
  v_first_activity timestamptz;
  v_last_activity timestamptz;
begin
  -- Calculate aggregated stats from public records only
  select
    count(*),
    coalesce(sum(distance_km), 0),
    coalesce(sum(duration_seconds), 0),
    round(avg(pace_seconds_per_km)),
    min(recorded_at),
    max(recorded_at)
  into
    v_total_records,
    v_total_distance,
    v_total_duration,
    v_avg_pace,
    v_first_activity,
    v_last_activity
  from public.records
  where mission_id = p_mission_id
    and profile_id = p_profile_id
    and visibility = 'public';

  -- If no records, delete the stats row
  if v_total_records = 0 then
    delete from public.mission_participant_stats
    where mission_id = p_mission_id and profile_id = p_profile_id;
    return;
  end if;

  -- Upsert stats
  insert into public.mission_participant_stats (
    mission_id,
    profile_id,
    total_records,
    total_distance_km,
    total_duration_seconds,
    avg_pace_seconds_per_km,
    first_activity_at,
    last_activity_at,
    updated_at
  ) values (
    p_mission_id,
    p_profile_id,
    v_total_records,
    v_total_distance,
    v_total_duration,
    v_avg_pace,
    v_first_activity,
    v_last_activity,
    now()
  )
  on conflict (mission_id, profile_id)
  do update set
    total_records = excluded.total_records,
    total_distance_km = excluded.total_distance_km,
    total_duration_seconds = excluded.total_duration_seconds,
    avg_pace_seconds_per_km = excluded.avg_pace_seconds_per_km,
    first_activity_at = excluded.first_activity_at,
    last_activity_at = excluded.last_activity_at,
    updated_at = now();
end;
$$;

-- Trigger function to update stats when records change
create or replace function public.handle_record_stats_change()
returns trigger
language plpgsql
security definer
as $$
begin
  if TG_OP = 'DELETE' then
    perform recalculate_mission_participant_stats(OLD.mission_id, OLD.profile_id);
    return OLD;
  elsif TG_OP = 'UPDATE' then
    -- If mission or profile changed, recalculate both old and new
    if OLD.mission_id != NEW.mission_id or OLD.profile_id != NEW.profile_id then
      perform recalculate_mission_participant_stats(OLD.mission_id, OLD.profile_id);
    end if;
    perform recalculate_mission_participant_stats(NEW.mission_id, NEW.profile_id);
    return NEW;
  elsif TG_OP = 'INSERT' then
    perform recalculate_mission_participant_stats(NEW.mission_id, NEW.profile_id);
    return NEW;
  end if;
  return NULL;
end;
$$;

-- Create trigger on records table
drop trigger if exists update_mission_participant_stats on public.records;
create trigger update_mission_participant_stats
  after insert or update or delete on public.records
  for each row
  execute function handle_record_stats_change();

comment on table public.mission_participant_stats is
  'Aggregated statistics per participant per mission. Automatically updated via triggers.';
