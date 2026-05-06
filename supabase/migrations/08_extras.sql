-- =============================================================
-- FI Teamspace — Part 8: small extensions
-- - team_vision.whatsapp_group_url
-- - Sprint 0 (onboarding), inserted/upserted
-- =============================================================

alter table public.team_vision
  add column if not exists whatsapp_group_url text;

-- Sprint 0 (Onboarding) — preparation phase before Week 1
delete from public.sprints where week_number = 0;
insert into public.sprints (name, week_number, start_date, end_date, description, is_current)
values (
  'Onboarding',
  0,
  '2026-04-27',
  '2026-05-03',
  'Pre-program preparation: complete the Founder Onboarding sprint, review the schedule, set up your tools, write your one-line problem statement.',
  current_date < '2026-05-04'
);
