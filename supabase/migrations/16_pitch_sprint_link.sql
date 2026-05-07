-- =============================================================
-- Tie each pitch to a specific sprint (week) so Working Group and
-- Cohort Session present-modes can show only the pitches that
-- belong to the week being presented.
-- =============================================================

alter table public.pitches
  add column if not exists sprint_id uuid references public.sprints(id) on delete set null;

create index if not exists pitches_sprint_id_idx on public.pitches(sprint_id);

-- Backfill: assign each existing pitch to whichever sprint's date range
-- contains its created_at (UTC date). Idempotent: only fills nulls.
update public.pitches p
set sprint_id = s.id
from public.sprints s
where p.sprint_id is null
  and ((p.created_at at time zone 'UTC')::date) between s.start_date and s.end_date;
