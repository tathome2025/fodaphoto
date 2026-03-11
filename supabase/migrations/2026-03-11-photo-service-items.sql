create table if not exists public.photo_service_items (
  photo_id uuid not null references public.photos(id) on delete cascade,
  service_item_id text not null references public.service_items(id),
  sort_order integer not null default 100,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (photo_id, service_item_id)
);

create index if not exists photo_service_items_photo_id_idx
  on public.photo_service_items(photo_id, sort_order);

create index if not exists photo_service_items_service_item_id_idx
  on public.photo_service_items(service_item_id);

alter table public.photo_service_items enable row level security;

drop policy if exists "photo service items read own photo" on public.photo_service_items;
create policy "photo service items read own photo"
  on public.photo_service_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.photos
      join public.capture_sets on capture_sets.id = photos.capture_set_id
      where photos.id = photo_service_items.photo_id
        and capture_sets.created_by = auth.uid()
    )
  );

drop policy if exists "photo service items insert own photo" on public.photo_service_items;
create policy "photo service items insert own photo"
  on public.photo_service_items
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.photos
      join public.capture_sets on capture_sets.id = photos.capture_set_id
      where photos.id = photo_service_items.photo_id
        and capture_sets.created_by = auth.uid()
    )
  );

drop policy if exists "photo service items update own photo" on public.photo_service_items;
create policy "photo service items update own photo"
  on public.photo_service_items
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.photos
      join public.capture_sets on capture_sets.id = photos.capture_set_id
      where photos.id = photo_service_items.photo_id
        and capture_sets.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.photos
      join public.capture_sets on capture_sets.id = photos.capture_set_id
      where photos.id = photo_service_items.photo_id
        and capture_sets.created_by = auth.uid()
    )
  );

drop policy if exists "photo service items delete own photo" on public.photo_service_items;
create policy "photo service items delete own photo"
  on public.photo_service_items
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.photos
      join public.capture_sets on capture_sets.id = photos.capture_set_id
      where photos.id = photo_service_items.photo_id
        and capture_sets.created_by = auth.uid()
    )
  );

insert into public.photo_service_items (photo_id, service_item_id, sort_order)
select
  id as photo_id,
  service_item_id,
  10 as sort_order
from public.photos
where kind = 'accessory'
  and service_item_id is not null
on conflict (photo_id, service_item_id) do nothing;
