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

alter table public.photos
  drop constraint if exists accessory_requires_service_item;

alter table public.photos
  add constraint accessory_requires_service_item
  check (
    ((kind = 'vehicle' or kind = 'order_sheet') and service_item_id is null)
    or (kind = 'accessory' and service_item_id is not null)
  );
