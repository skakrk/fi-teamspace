-- =============================================================
-- FI Teamspace — Part 14: meeting kind
-- Distinguishes weekly Working Group sessions from cohort-wide sessions
-- (Hot Seats, Strategic Pitches, mentor sessions, etc.).
-- =============================================================

alter table public.meetings
  add column if not exists kind text not null default 'working_group'
    check (kind in ('working_group', 'cohort_session'));
