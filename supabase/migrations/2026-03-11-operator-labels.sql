alter table public.capture_sets
  add column if not exists created_by_label text not null default '';

update public.capture_sets
set created_by_label = coalesce(nullif(created_by_label, ''), created_by::text)
where created_by_label = '';

alter table public.photos
  add column if not exists created_by uuid references auth.users(id);

alter table public.photos
  add column if not exists created_by_label text not null default '';

update public.photos
set
  created_by = coalesce(photos.created_by, capture_sets.created_by),
  created_by_label = coalesce(nullif(photos.created_by_label, ''), nullif(capture_sets.created_by_label, ''), capture_sets.created_by::text)
from public.capture_sets
where capture_sets.id = photos.capture_set_id
  and (photos.created_by is null or photos.created_by_label = '');
