-- Ensure crew owners are always registered as membership with owner role

create or replace function public.ensure_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.crew_members (crew_id, profile_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (crew_id, profile_id)
    do update set role = excluded.role,
                 updated_at = now();
  return new;
end;
$$;

drop trigger if exists ensure_owner_membership_trigger on public.crews;

create trigger ensure_owner_membership_trigger
  after insert on public.crews
  for each row
  execute procedure public.ensure_owner_membership();
