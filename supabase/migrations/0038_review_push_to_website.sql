-- Spec §6n: push a published review over to the matching product page
-- on adventure-lombok.com (via a small companion WordPress plugin),
-- for any product that has a source_url set (§5). Tracks the outcome
-- per review so a failed push can be retried later without guessing
-- which ones already went through, and so it never blocks or delays
-- the review from going live in the app itself -- the one place that
-- matters most.
--
-- Run in the Supabase SQL Editor, same as earlier migrations.

alter table reviews add column if not exists pushed_to_website text not null default 'not_applicable';
alter table reviews drop constraint if exists reviews_pushed_to_website_check;
alter table reviews add constraint reviews_pushed_to_website_check
  check (pushed_to_website in ('not_applicable', 'pending', 'pushed', 'failed'));

-- How many times a push has been attempted -- the retry cron
-- (/api/cron/retry-review-pushes) gives up quietly after a handful of
-- tries rather than retrying a genuinely broken push forever.
alter table reviews add column if not exists push_attempts integer not null default 0;
