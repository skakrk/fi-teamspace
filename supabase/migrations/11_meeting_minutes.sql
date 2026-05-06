-- =============================================================
-- FI Teamspace — Part 11: structured Meeting Minutes
-- Per FI guide, Meeting Minutes should include:
--   1. Attendance                       (already auto-tracked in meeting_attendance)
--   2. New successes & challenges +
--      high-level discussion points     (round-robin = meeting_updates;
--                                        + free-form discussion text)
--   3. High-level questions re: Sprint  (free-form)
--   4. Items to review / discuss next   (free-form)
--
-- We add 3 structured columns to meeting_notes; the existing `content`
-- column stays as legacy / additional notes. Old data isn't migrated;
-- President can re-paste relevant parts into the new sections.
-- =============================================================

alter table public.meeting_notes
  add column if not exists discussion_points    text,
  add column if not exists sprint_questions     text,
  add column if not exists next_meeting_review  text;
