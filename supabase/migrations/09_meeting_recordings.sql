-- =============================================================
-- FI Teamspace — Part 9: meeting recordings & transcripts
-- Optional links to Loom / Otter / tl;dv / Tactiq output, plus
-- AI summary text. Paste-driven; no bot integration required.
-- =============================================================

alter table public.meetings
  add column if not exists recording_url text,
  add column if not exists transcript_url text,
  add column if not exists summary text;
