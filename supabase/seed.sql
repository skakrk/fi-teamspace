-- Optional seed: a starter sprint for Team Breakers + sample FI leaderboard.
-- Run in Supabase SQL Editor after the initial schema.

insert into public.sprints (name, week_number, start_date, end_date, description, is_current)
values
  ('Sprint 1: Idea Validation', 1, current_date, current_date + 7, 'Validate problem and target customer.', true);

with s as (select id from public.sprints where week_number = 1 limit 1)
insert into public.sprint_tasks (sprint_id, title, sort_order)
select s.id, t.title, t.sort_order from s, (values
  ('Define problem statement (1 sentence)', 1),
  ('Conduct 5 customer interviews', 2),
  ('Write Feedback Pitch v1', 3),
  ('Identify top 3 competitors', 4),
  ('Draft Vision & Mission', 5)
) as t(title, sort_order);

-- Sample leaderboard snapshot (current state per screenshot)
insert into public.fi_leaderboard (recorded_at, team_name, score, rank) values
  (current_date, 'Team Хамелеонов', 2.0, 1),
  (current_date, 'Team Альф',       1.9, 2),
  (current_date, 'Team Breakers',   1.4, 3),
  (current_date, 'Team Бластеров',  1.3, 4),
  (current_date, 'Team Капитанов',  1.0, 5);
