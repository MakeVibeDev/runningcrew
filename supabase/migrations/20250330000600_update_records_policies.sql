-- Refine records policies so only mission 참여자가 기록을 업로드할 수 있도록 제한

/* Remove previous broad owner policy */
drop policy if exists "Records manageable by owner" on public.records;

drop policy if exists "Records insert by participant" on public.records;

drop policy if exists "Records update by owner" on public.records;

drop policy if exists "Records delete by owner" on public.records;

create policy "Records insert by participant" on public.records
  for insert
  with check (
    auth.uid() = profile_id
    and exists (
      select 1
      from public.mission_participants mp
      where mp.mission_id = mission_id
        and mp.profile_id = profile_id
        and mp.status = 'joined'
    )
  );

create policy "Records update by owner" on public.records
  for update
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

create policy "Records delete by owner" on public.records
  for delete
  using (auth.uid() = profile_id);
