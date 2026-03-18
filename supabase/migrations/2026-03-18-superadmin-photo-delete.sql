drop policy if exists "photos delete own set" on public.photos;
drop policy if exists "photos delete team set" on public.photos;
drop policy if exists "photos delete superadmin only" on public.photos;
create policy "photos delete superadmin only"
  on public.photos
  for delete
  to authenticated
  using (
    lower(coalesce(
      auth.jwt() -> 'app_metadata' ->> 'group',
      auth.jwt() -> 'app_metadata' ->> 'role',
      auth.jwt() -> 'user_metadata' ->> 'group',
      auth.jwt() -> 'user_metadata' ->> 'role',
      ''
    )) in ('superadmin', 'supreadmin')
    and exists (
      select 1
      from public.capture_sets
      where capture_sets.id = photos.capture_set_id
    )
  );

drop policy if exists "storage delete own originals" on storage.objects;
drop policy if exists "storage delete team originals" on storage.objects;
drop policy if exists "storage delete superadmin only" on storage.objects;
create policy "storage delete superadmin only"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'garage-originals'
    and lower(coalesce(
      auth.jwt() -> 'app_metadata' ->> 'group',
      auth.jwt() -> 'app_metadata' ->> 'role',
      auth.jwt() -> 'user_metadata' ->> 'group',
      auth.jwt() -> 'user_metadata' ->> 'role',
      ''
    )) in ('superadmin', 'supreadmin')
  );
