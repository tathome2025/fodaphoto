drop policy if exists "brands insert by authenticated users" on public.brands;
create policy "brands insert by authenticated users"
  on public.brands
  for insert
  to authenticated
  with check (true);

drop policy if exists "brands update by authenticated users" on public.brands;
create policy "brands update by authenticated users"
  on public.brands
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "service items insert by authenticated users" on public.service_items;
create policy "service items insert by authenticated users"
  on public.service_items
  for insert
  to authenticated
  with check (true);

drop policy if exists "service items update by authenticated users" on public.service_items;
create policy "service items update by authenticated users"
  on public.service_items
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "capture sets read own" on public.capture_sets;
drop policy if exists "capture sets read team" on public.capture_sets;
create policy "capture sets read team"
  on public.capture_sets
  for select
  to authenticated
  using (true);

drop policy if exists "capture sets insert own" on public.capture_sets;
drop policy if exists "capture sets insert team" on public.capture_sets;
create policy "capture sets insert team"
  on public.capture_sets
  for insert
  to authenticated
  with check (true);

drop policy if exists "capture sets update own" on public.capture_sets;
drop policy if exists "capture sets update team" on public.capture_sets;
create policy "capture sets update team"
  on public.capture_sets
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "photos read own set" on public.photos;
drop policy if exists "photos read team set" on public.photos;
create policy "photos read team set"
  on public.photos
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.capture_sets
      where capture_sets.id = photos.capture_set_id
    )
  );

drop policy if exists "photos insert own set" on public.photos;
drop policy if exists "photos insert team set" on public.photos;
create policy "photos insert team set"
  on public.photos
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.capture_sets
      where capture_sets.id = photos.capture_set_id
    )
  );

drop policy if exists "photos update own set" on public.photos;
drop policy if exists "photos update team set" on public.photos;
create policy "photos update team set"
  on public.photos
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.capture_sets
      where capture_sets.id = photos.capture_set_id
    )
  )
  with check (
    exists (
      select 1
      from public.capture_sets
      where capture_sets.id = photos.capture_set_id
    )
  );

drop policy if exists "photo service items read own photo" on public.photo_service_items;
drop policy if exists "photo service items read team photo" on public.photo_service_items;
create policy "photo service items read team photo"
  on public.photo_service_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.photos
      where photos.id = photo_service_items.photo_id
    )
  );

drop policy if exists "photo service items insert own photo" on public.photo_service_items;
drop policy if exists "photo service items insert team photo" on public.photo_service_items;
create policy "photo service items insert team photo"
  on public.photo_service_items
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.photos
      where photos.id = photo_service_items.photo_id
    )
  );

drop policy if exists "photo service items update own photo" on public.photo_service_items;
drop policy if exists "photo service items update team photo" on public.photo_service_items;
create policy "photo service items update team photo"
  on public.photo_service_items
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.photos
      where photos.id = photo_service_items.photo_id
    )
  )
  with check (
    exists (
      select 1
      from public.photos
      where photos.id = photo_service_items.photo_id
    )
  );

drop policy if exists "photo service items delete own photo" on public.photo_service_items;
drop policy if exists "photo service items delete team photo" on public.photo_service_items;
create policy "photo service items delete team photo"
  on public.photo_service_items
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.photos
      where photos.id = photo_service_items.photo_id
    )
  );

drop policy if exists "photo edits read own photo" on public.photo_edits;
drop policy if exists "photo edits read team photo" on public.photo_edits;
create policy "photo edits read team photo"
  on public.photo_edits
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.photos
      where photos.id = photo_edits.photo_id
    )
  );

drop policy if exists "photo edits insert own photo" on public.photo_edits;
drop policy if exists "photo edits insert team photo" on public.photo_edits;
create policy "photo edits insert team photo"
  on public.photo_edits
  for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1
      from public.photos
      where photos.id = photo_edits.photo_id
    )
  );

drop policy if exists "photo edits update own photo" on public.photo_edits;
drop policy if exists "photo edits update team photo" on public.photo_edits;
create policy "photo edits update team photo"
  on public.photo_edits
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.photos
      where photos.id = photo_edits.photo_id
    )
  )
  with check (
    exists (
      select 1
      from public.photos
      where photos.id = photo_edits.photo_id
    )
  );

drop policy if exists "storage read own originals" on storage.objects;
drop policy if exists "storage read team originals" on storage.objects;
create policy "storage read team originals"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'garage-originals');

drop policy if exists "storage insert own originals" on storage.objects;
drop policy if exists "storage insert team originals" on storage.objects;
create policy "storage insert team originals"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'garage-originals');

drop policy if exists "storage update own originals" on storage.objects;
drop policy if exists "storage update team originals" on storage.objects;
create policy "storage update team originals"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'garage-originals')
  with check (bucket_id = 'garage-originals');

drop policy if exists "storage delete own originals" on storage.objects;
drop policy if exists "storage delete team originals" on storage.objects;
create policy "storage delete team originals"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'garage-originals');
