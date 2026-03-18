create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'photo_kind'
  ) then
    create type public.photo_kind as enum ('vehicle', 'accessory');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_enum
    where enumlabel = 'order_sheet'
      and enumtypid = 'public.photo_kind'::regtype
  ) then
    alter type public.photo_kind add value 'order_sheet';
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

create table if not exists public.brand_vehicle_models (
  brand_id text not null references public.brands(id) on delete cascade,
  model_key text not null,
  model_name text not null,
  last_used_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (brand_id, model_key)
);

create table if not exists public.capture_sets (
  id uuid primary key default gen_random_uuid(),
  reference text not null,
  capture_date date not null,
  notes text not null default '',
  brand_id text not null references public.brands(id),
  vehicle_model text not null default '',
  created_by uuid not null references auth.users(id),
  created_by_label text not null default '',
  service_completed_at timestamptz,
  service_completed_by uuid references auth.users(id),
  service_completed_by_label text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.capture_sets
  add column if not exists vehicle_model text not null default '';

alter table public.capture_sets
  add column if not exists created_by_label text not null default '';

alter table public.capture_sets
  add column if not exists service_completed_at timestamptz;

alter table public.capture_sets
  add column if not exists service_completed_by uuid references auth.users(id);

alter table public.capture_sets
  add column if not exists service_completed_by_label text not null default '';

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
  created_by uuid references auth.users(id),
  created_by_label text not null default '',
  taken_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint accessory_requires_service_item
    check (
      ((kind = 'vehicle' or kind = 'order_sheet') and service_item_id is null)
      or (kind = 'accessory' and service_item_id is not null)
    )
);

alter table public.photos
  add column if not exists created_by uuid references auth.users(id);

alter table public.photos
  add column if not exists created_by_label text not null default '';

alter table public.photos
  drop constraint if exists accessory_requires_service_item;

alter table public.photos
  add constraint accessory_requires_service_item
  check (
    ((kind = 'vehicle' or kind = 'order_sheet') and service_item_id is null)
    or (kind = 'accessory' and service_item_id is not null)
  );

create table if not exists public.photo_service_items (
  photo_id uuid not null references public.photos(id) on delete cascade,
  service_item_id text not null references public.service_items(id),
  sort_order integer not null default 100,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (photo_id, service_item_id)
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

create index if not exists brand_vehicle_models_brand_id_last_used_at_idx
  on public.brand_vehicle_models(brand_id, last_used_at desc);

create index if not exists photo_service_items_photo_id_idx
  on public.photo_service_items(photo_id, sort_order);

create index if not exists photo_service_items_service_item_id_idx
  on public.photo_service_items(service_item_id);

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
alter table public.brand_vehicle_models enable row level security;
alter table public.capture_sets enable row level security;
alter table public.photos enable row level security;
alter table public.photo_service_items enable row level security;
alter table public.filters enable row level security;
alter table public.photo_edits enable row level security;

drop policy if exists "brands readable by authenticated users" on public.brands;
create policy "brands readable by authenticated users"
  on public.brands
  for select
  to authenticated
  using (true);

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

drop policy if exists "service items readable by authenticated users" on public.service_items;
create policy "service items readable by authenticated users"
  on public.service_items
  for select
  to authenticated
  using (true);

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

drop policy if exists "brand vehicle models readable by authenticated users" on public.brand_vehicle_models;
create policy "brand vehicle models readable by authenticated users"
  on public.brand_vehicle_models
  for select
  to authenticated
  using (true);

drop policy if exists "brand vehicle models insert by authenticated users" on public.brand_vehicle_models;
create policy "brand vehicle models insert by authenticated users"
  on public.brand_vehicle_models
  for insert
  to authenticated
  with check (true);

drop policy if exists "brand vehicle models update by authenticated users" on public.brand_vehicle_models;
create policy "brand vehicle models update by authenticated users"
  on public.brand_vehicle_models
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

drop policy if exists "photos delete own set" on public.photos;
drop policy if exists "photos delete team set" on public.photos;
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

insert into public.photo_service_items (photo_id, service_item_id, sort_order)
select
  id as photo_id,
  service_item_id,
  10 as sort_order
from public.photos
where kind = 'accessory'
  and service_item_id is not null
on conflict (photo_id, service_item_id) do nothing;

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

comment on table public.capture_sets is
  '每次拍攝的一組案件，車輛品牌、車輛照與多個配件項目都連到這張主表。';

comment on table public.photos is
  '原始相片資料。vehicle 與 accessory 共用一表，service_item_id 保留配件相的主要分類。';

comment on table public.photo_service_items is
  '配件相片與多個配件 / 維修項目的對應表。每張配件相可連到多個 service item。';

comment on table public.brand_vehicle_models is
  '各品牌共用的車型資料庫。不同設備與帳號可共用最近輸入過的車型。';

comment on table public.photo_edits is
  '非破壞式編修紀錄。正式版建議保留歷史，真正輸出檔只在下載或另存時生成。';

comment on column public.photos.storage_path is
  '建議格式：{auth.uid}/originals/YYYY/MM/DD/{capture_set_id}/{photo_id}.jpg';

comment on column public.photos.service_item_id is
  '配件相的主要分類。完整多選關聯請看 photo_service_items。';

comment on column public.capture_sets.created_by_label is
  '建立 Check-in 案件的帳號標記，用於多人分工畫面顯示。';

comment on column public.capture_sets.service_completed_at is
  '安裝維修保養已完成的時間。完成後不再於安裝維修保養頁顯示。';

comment on column public.capture_sets.service_completed_by_label is
  '按下完成安裝維修保養的帳號標記。';

comment on column public.photos.created_by_label is
  '建立這張相片及其對應輸入資料的帳號標記，用於多人分工畫面顯示。';
