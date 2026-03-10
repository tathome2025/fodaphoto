create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'photo_kind'
  ) then
    create type public.photo_kind as enum ('vehicle', 'accessory');
  end if;
end $$;

create table if not exists public.brands (
  id text primary key,
  name text not null,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.service_items (
  id text primary key,
  name text not null,
  category text not null default 'accessory',
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.capture_sets (
  id uuid primary key default gen_random_uuid(),
  reference text not null,
  capture_date date not null,
  notes text not null default '',
  brand_id text not null references public.brands(id),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  capture_set_id uuid not null references public.capture_sets(id) on delete cascade,
  kind public.photo_kind not null,
  service_item_id text references public.service_items(id),
  item_note text not null default '',
  storage_path text not null,
  original_file_name text not null,
  mime_type text not null,
  width integer,
  height integer,
  sort_order integer not null default 100,
  taken_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint accessory_requires_service_item
    check ((kind = 'vehicle' and service_item_id is null) or (kind = 'accessory' and service_item_id is not null))
);

create table if not exists public.filters (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id),
  name text not null,
  adjustments jsonb not null,
  is_shared boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint filters_adjustments_is_object check (jsonb_typeof(adjustments) = 'object')
);

create table if not exists public.photo_edits (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references public.photos(id) on delete cascade,
  filter_id uuid references public.filters(id),
  adjustments jsonb not null,
  edited_storage_path text,
  is_current boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default timezone('utc', now()),
  constraint photo_edits_adjustments_is_object check (jsonb_typeof(adjustments) = 'object')
);

create unique index if not exists photo_edits_one_current_per_photo_idx
  on public.photo_edits(photo_id)
  where is_current = true;

create index if not exists capture_sets_capture_date_idx
  on public.capture_sets(capture_date desc);

create index if not exists capture_sets_brand_id_idx
  on public.capture_sets(brand_id);

create index if not exists photos_capture_set_id_idx
  on public.photos(capture_set_id, sort_order);

create index if not exists photos_service_item_id_idx
  on public.photos(service_item_id);

create index if not exists filters_created_by_idx
  on public.filters(created_by);

insert into public.brands (id, name, sort_order)
values
  ('bmw', 'BMW', 10),
  ('mercedes', 'Mercedes-Benz', 20),
  ('porsche', 'Porsche', 30),
  ('toyota', 'Toyota', 40),
  ('honda', 'Honda', 50),
  ('tesla', 'Tesla', 60)
on conflict (id) do update
set
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_active = true;

insert into public.service_items (id, name, category, sort_order)
values
  ('suspension', '避震 / 懸掛', 'accessory', 10),
  ('brakes', '煞車系統', 'accessory', 20),
  ('bodykit', '包圍 / 前後唇', 'accessory', 30),
  ('wheels', '輪圈 / 輪胎', 'accessory', 40),
  ('exhaust', '排氣系統', 'accessory', 50),
  ('maintenance', '保養 / 維修', 'maintenance', 60)
on conflict (id) do update
set
  name = excluded.name,
  category = excluded.category,
  sort_order = excluded.sort_order,
  is_active = true;

alter table public.brands enable row level security;
alter table public.service_items enable row level security;
alter table public.capture_sets enable row level security;
alter table public.photos enable row level security;
alter table public.filters enable row level security;
alter table public.photo_edits enable row level security;

drop policy if exists "brands readable by authenticated users" on public.brands;
create policy "brands readable by authenticated users"
  on public.brands
  for select
  to authenticated
  using (true);

drop policy if exists "service items readable by authenticated users" on public.service_items;
create policy "service items readable by authenticated users"
  on public.service_items
  for select
  to authenticated
  using (true);

drop policy if exists "capture sets read own" on public.capture_sets;
create policy "capture sets read own"
  on public.capture_sets
  for select
  to authenticated
  using (created_by = auth.uid());

drop policy if exists "capture sets insert own" on public.capture_sets;
create policy "capture sets insert own"
  on public.capture_sets
  for insert
  to authenticated
  with check (created_by = auth.uid());

drop policy if exists "capture sets update own" on public.capture_sets;
create policy "capture sets update own"
  on public.capture_sets
  for update
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

drop policy if exists "photos read own set" on public.photos;
create policy "photos read own set"
  on public.photos
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.capture_sets
      where capture_sets.id = photos.capture_set_id
        and capture_sets.created_by = auth.uid()
    )
  );

drop policy if exists "photos insert own set" on public.photos;
create policy "photos insert own set"
  on public.photos
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.capture_sets
      where capture_sets.id = photos.capture_set_id
        and capture_sets.created_by = auth.uid()
    )
  );

drop policy if exists "photos update own set" on public.photos;
create policy "photos update own set"
  on public.photos
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.capture_sets
      where capture_sets.id = photos.capture_set_id
        and capture_sets.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.capture_sets
      where capture_sets.id = photos.capture_set_id
        and capture_sets.created_by = auth.uid()
    )
  );

drop policy if exists "filters read own or shared" on public.filters;
create policy "filters read own or shared"
  on public.filters
  for select
  to authenticated
  using (created_by = auth.uid() or is_shared = true);

drop policy if exists "filters insert own" on public.filters;
create policy "filters insert own"
  on public.filters
  for insert
  to authenticated
  with check (created_by = auth.uid());

drop policy if exists "filters update own" on public.filters;
create policy "filters update own"
  on public.filters
  for update
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

drop policy if exists "photo edits read own photo" on public.photo_edits;
create policy "photo edits read own photo"
  on public.photo_edits
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.photos
      join public.capture_sets on capture_sets.id = photos.capture_set_id
      where photos.id = photo_edits.photo_id
        and capture_sets.created_by = auth.uid()
    )
  );

drop policy if exists "photo edits insert own photo" on public.photo_edits;
create policy "photo edits insert own photo"
  on public.photo_edits
  for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1
      from public.photos
      join public.capture_sets on capture_sets.id = photos.capture_set_id
      where photos.id = photo_edits.photo_id
        and capture_sets.created_by = auth.uid()
    )
  );

drop policy if exists "photo edits update own photo" on public.photo_edits;
create policy "photo edits update own photo"
  on public.photo_edits
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.photos
      join public.capture_sets on capture_sets.id = photos.capture_set_id
      where photos.id = photo_edits.photo_id
        and capture_sets.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.photos
      join public.capture_sets on capture_sets.id = photos.capture_set_id
      where photos.id = photo_edits.photo_id
        and capture_sets.created_by = auth.uid()
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'garage-originals',
  'garage-originals',
  false,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "storage read own originals" on storage.objects;
create policy "storage read own originals"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'garage-originals'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "storage insert own originals" on storage.objects;
create policy "storage insert own originals"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'garage-originals'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "storage update own originals" on storage.objects;
create policy "storage update own originals"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'garage-originals'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'garage-originals'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "storage delete own originals" on storage.objects;
create policy "storage delete own originals"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'garage-originals'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

comment on table public.capture_sets is
  '每次拍攝的一組案件，車輛品牌、車輛照與多個配件項目都連到這張主表。';

comment on table public.photos is
  '原始相片資料。vehicle 與 accessory 共用一表，accessory 需帶 service_item_id。';

comment on table public.photo_edits is
  '非破壞式編修紀錄。正式版建議保留歷史，真正輸出檔只在下載或另存時生成。';

comment on column public.photos.storage_path is
  '建議格式：{auth.uid}/originals/YYYY/MM/DD/{capture_set_id}/{photo_id}.jpg';
