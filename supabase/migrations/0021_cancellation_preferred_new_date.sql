-- Spec §6f follow-up: a customer choosing "reschedule" as their
-- preferred resolution had no way to say *which* new date they wanted
-- -- staff would have had to ask separately. Adds an optional date the
-- customer can propose on the request form itself. Same "preference,
-- not a binding choice" shape as preferred_resolution (migration
-- 0020): admins still pick the actual new_slot_date when approving a
-- reschedule (this just pre-fills that field with what the customer
-- asked for, and lets the admin pick a different date when it's not
-- available). Run in the Supabase SQL Editor, same as earlier
-- migrations.

alter table cancellation_requests
  add column if not exists preferred_new_date date;
