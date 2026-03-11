create table if not exists public.brand_vehicle_models (
  brand_id text not null references public.brands(id) on delete cascade,
  model_key text not null,
  model_name text not null,
  last_used_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (brand_id, model_key)
);

create index if not exists brand_vehicle_models_brand_id_last_used_at_idx
  on public.brand_vehicle_models(brand_id, last_used_at desc);

alter table public.brand_vehicle_models enable row level security;

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
