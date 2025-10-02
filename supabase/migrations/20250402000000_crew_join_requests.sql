-- Crew join requests table for managing crew membership applications

create table if not exists public.crew_join_requests (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references public.crews (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  message text, -- Optional message from applicant
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id),

  -- Prevent duplicate pending requests
  unique (crew_id, profile_id, status)
);

create index if not exists crew_join_requests_crew_id_idx on public.crew_join_requests (crew_id);
create index if not exists crew_join_requests_profile_id_idx on public.crew_join_requests (profile_id);
create index if not exists crew_join_requests_status_idx on public.crew_join_requests (status);

alter table public.crew_join_requests enable row level security;

-- Users can view their own join requests
drop policy if exists "Users can view own join requests" on public.crew_join_requests;
create policy "Users can view own join requests" on public.crew_join_requests
  for select
  using (auth.uid() = profile_id);

-- Users can create join requests for themselves
drop policy if exists "Users can create join requests" on public.crew_join_requests;
create policy "Users can create join requests" on public.crew_join_requests
  for insert
  with check (
    auth.uid() = profile_id
    -- Ensure user is not already a member
    and not exists (
      select 1 from public.crew_members
      where crew_id = crew_join_requests.crew_id
      and profile_id = auth.uid()
    )
  );

-- Users can cancel their own pending requests
drop policy if exists "Users can cancel own pending requests" on public.crew_join_requests;
create policy "Users can cancel own pending requests" on public.crew_join_requests
  for delete
  using (
    auth.uid() = profile_id
    and status = 'pending'
  );

-- Crew owners and admins can view all requests for their crew
drop policy if exists "Crew leaders can view requests" on public.crew_join_requests;
create policy "Crew leaders can view requests" on public.crew_join_requests
  for select
  using (
    exists (
      select 1 from public.crew_members
      where crew_id = crew_join_requests.crew_id
      and profile_id = auth.uid()
      and role in ('owner', 'admin')
    )
  );

-- Crew owners and admins can update request status
drop policy if exists "Crew leaders can update requests" on public.crew_join_requests;
create policy "Crew leaders can update requests" on public.crew_join_requests
  for update
  using (
    exists (
      select 1 from public.crew_members
      where crew_id = crew_join_requests.crew_id
      and profile_id = auth.uid()
      and role in ('owner', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.crew_members
      where crew_id = crew_join_requests.crew_id
      and profile_id = auth.uid()
      and role in ('owner', 'admin')
    )
  );

-- Function to automatically add approved user to crew_members
create or replace function handle_approved_join_request()
returns trigger as $$
begin
  -- Only process when status changes to 'approved'
  if new.status = 'approved' and (old.status is null or old.status != 'approved') then
    -- Add user to crew_members
    insert into public.crew_members (crew_id, profile_id, role)
    values (new.crew_id, new.profile_id, 'member')
    on conflict (crew_id, profile_id) do nothing;

    -- Set reviewed metadata
    new.reviewed_at = now();
    new.reviewed_by = auth.uid();
  end if;

  -- Set reviewed metadata for rejections too
  if new.status = 'rejected' and (old.status is null or old.status != 'rejected') then
    new.reviewed_at = now();
    new.reviewed_by = auth.uid();
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Trigger to handle approved join requests
drop trigger if exists on_join_request_approved on public.crew_join_requests;
create trigger on_join_request_approved
  before update on public.crew_join_requests
  for each row
  execute function handle_approved_join_request();

-- Updated_at trigger
create or replace function update_crew_join_requests_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_crew_join_requests_updated_at on public.crew_join_requests;
create trigger update_crew_join_requests_updated_at
  before update on public.crew_join_requests
  for each row
  execute function update_crew_join_requests_updated_at();
