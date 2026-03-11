alter table public.capture_sets
  add column if not exists service_completed_at timestamptz;

alter table public.capture_sets
  add column if not exists service_completed_by uuid references auth.users(id);

alter table public.capture_sets
  add column if not exists service_completed_by_label text not null default '';
