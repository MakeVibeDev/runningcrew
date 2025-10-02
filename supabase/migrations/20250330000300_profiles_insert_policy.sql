-- Allow users to insert their own profile row after first login

drop policy if exists "Profiles self-insert" on public.profiles;

create policy "Profiles self-insert" on public.profiles
  for insert
  with check (auth.uid() = id);
