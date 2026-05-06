-- =============================================================
-- One-shot helper: keep only ONE sprint as is_current.
-- Picks the latest sprint whose start_date <= today.
-- Run any time the "current" flag drifts (e.g. multiple weeks overlap).
-- =============================================================

update public.sprints set is_current = false;

with cur as (
  select id from public.sprints
  where start_date <= current_date
  order by start_date desc, week_number desc
  limit 1
)
update public.sprints
   set is_current = true
 where id in (select id from cur);
