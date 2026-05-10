-- =============================================================
-- FI Teamspace — Part 21: mark teammates as dropped out
--
-- Some founders leave the cohort mid-program. We want to keep their
-- history (past pitches, reflections, sprint contributions) but flag
-- them so the team & president can see at a glance who's still in.
-- Reversible — un-tick the flag if they come back.
-- =============================================================

alter table public.profiles
  add column if not exists is_dropped_out boolean not null default false;

alter table public.profiles
  add column if not exists dropped_out_at timestamptz;

-- Existing RLS already lets the president update profiles
-- (migration 18_president_mode.sql). No new policy needed.
