-- =============================================================
-- FI Teamspace — Part 10: raw transcript text on meetings
-- For when teammates have a transcript file (.txt) but no shareable URL.
-- =============================================================

alter table public.meetings
  add column if not exists transcript_text text;
