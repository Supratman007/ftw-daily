-- Car types already have a photo (image_url, migration 0028) so a
-- customer can see the car before booking it -- transport_vehicle_types
-- never got the same field. Run in the Supabase SQL Editor, same as
-- earlier migrations.
alter table transport_vehicle_types
  add column if not exists image_url text;
