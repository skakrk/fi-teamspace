-- Optional seed: starter sprint + current cohort snapshot from FI dashboard.
-- Run in Supabase SQL Editor after the schema migrations.

-- -----------------------------
-- Sprint 1
-- -----------------------------
insert into public.sprints (name, week_number, start_date, end_date, description, is_current)
values ('Sprint 1: Idea Validation', 1, current_date, current_date + 7, 'Validate problem and target customer.', true);

with s as (select id from public.sprints where week_number = 1 limit 1)
insert into public.sprint_tasks (sprint_id, title, sort_order)
select s.id, t.title, t.sort_order from s, (values
  ('Define problem statement (1 sentence)', 1),
  ('Conduct 5 customer interviews', 2),
  ('Write Feedback Pitch v1', 3),
  ('Identify top 3 competitors', 4),
  ('Draft Vision & Mission', 5)
) as t(title, sort_order);

-- -----------------------------
-- Cohort ratings — current FI snapshot (CEE Spring 2026)
-- score = numeric rating from FI; NULL = N/A.
-- Team total = avg of non-null member scores.
-- -----------------------------

-- Chameleons Team (avg 2.0)
insert into public.cohort_ratings (recorded_at, team_name, member_name, score, sort_order) values
  (current_date, 'Chameleons Team', 'Radu Zencenco',     2.0, 1),
  (current_date, 'Chameleons Team', 'Viktor Simeonov',   null, 2),
  (current_date, 'Chameleons Team', 'Iviko Matiashvili', null, 3),
  (current_date, 'Chameleons Team', 'Levan Gvarishvili', null, 4),
  (current_date, 'Chameleons Team', 'Reka Mokanszki',    null, 5);

-- Alphas Team (avg 1.85 ≈ 1.9)
insert into public.cohort_ratings (recorded_at, team_name, member_name, score, sort_order) values
  (current_date, 'Alphas Team', 'Bogdan Marculescu',   2.7, 1),
  (current_date, 'Alphas Team', 'Dragomir Markovski',  1.0, 2),
  (current_date, 'Alphas Team', 'Thanos Floros',       null, 3),
  (current_date, 'Alphas Team', 'Elene Bibileishvili', null, 4);

-- Breakers Team — OUR team (avg 1.4)
insert into public.cohort_ratings (recorded_at, team_name, member_name, score, sort_order) values
  (current_date, 'Breakers Team', 'Sandra Ehigiator',  1.5, 1),
  (current_date, 'Breakers Team', 'Alena Ivanova',     1.3, 2),
  (current_date, 'Breakers Team', 'Konstantin Skavitin', null, 3),
  (current_date, 'Breakers Team', 'Kujtim Krasniqi',   null, 4),
  (current_date, 'Breakers Team', 'Vladimir Kaverin',  null, 5),
  (current_date, 'Breakers Team', 'Kseniya Kultysheva', null, 6);

-- Blasters Team (avg 1.3)
insert into public.cohort_ratings (recorded_at, team_name, member_name, score, sort_order) values
  (current_date, 'Blasters Team', 'Adam Brown',         1.3, 1),
  (current_date, 'Blasters Team', 'Viktoriya Hristova', null, 2),
  (current_date, 'Blasters Team', 'Celso Bispo',        null, 3),
  (current_date, 'Blasters Team', 'Adelina Stanciu',    null, 4),
  (current_date, 'Blasters Team', 'Carlotta Conversi',  null, 5),
  (current_date, 'Blasters Team', 'Maged Fouda',        null, 6),
  (current_date, 'Blasters Team', 'Martin Vrbata',      null, 7);

-- Captains Team (avg 1.0)
insert into public.cohort_ratings (recorded_at, team_name, member_name, score, sort_order) values
  (current_date, 'Captains Team', 'Anastasiya Sarokina', 1.0, 1),
  (current_date, 'Captains Team', 'Teodora Roman',       null, 2),
  (current_date, 'Captains Team', 'Ali Noori',           null, 3),
  (current_date, 'Captains Team', 'Pavel Nikitin',       null, 4),
  (current_date, 'Captains Team', 'Lazaros Allilomis',   null, 5),
  (current_date, 'Captains Team', 'Mykhaylo Loboyko',    null, 6),
  (current_date, 'Captains Team', 'Amirkhon Koriev',     null, 7);
