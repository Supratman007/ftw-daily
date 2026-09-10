-- Car Hire's seat count and duration were both locked to a fixed short
-- list (4 or 6 seats; 6, 8, or 10 hour packages) -- fine as a starting
-- point, too rigid once the fleet grows. Both become plain positive
-- numbers instead. Note: seats above 6 legally require a licensed
-- guide under Indonesian park/transport regulation (spec §6a) -- this
-- migration removes the app-level guardrail, not the legal
-- requirement, so only add a bigger car here if you can operate it
-- properly. Run in the Supabase SQL Editor, same as earlier
-- migrations.

alter table car_types drop constraint if exists car_types_capacity_tier_check;
alter table car_types add constraint car_types_capacity_tier_check check (capacity_tier > 0);

alter table car_packages drop constraint if exists car_packages_duration_hours_check;
alter table car_packages add constraint car_packages_duration_hours_check check (duration_hours > 0);
