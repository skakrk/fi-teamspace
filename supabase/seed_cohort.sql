-- Cohort ratings seed (FI CEE Spring 2026 — current standings)
-- Run after 04_cohort_ratings.sql.
-- Idempotent: re-running for the same date upserts the same rows.

insert into public.cohort_ratings (recorded_at, team_name, member_name, score, sort_order) values
  -- Chameleons Team (avg 2.0)
  (current_date, 'Chameleons Team', 'Radu Zencenco',     2.0, 1),
  (current_date, 'Chameleons Team', 'Viktor Simeonov',   null, 2),
  (current_date, 'Chameleons Team', 'Iviko Matiashvili', null, 3),
  (current_date, 'Chameleons Team', 'Levan Gvarishvili', null, 4),
  (current_date, 'Chameleons Team', 'Reka Mokanszki',    null, 5),
  -- Alphas Team (avg 1.85 ≈ 1.9)
  (current_date, 'Alphas Team', 'Bogdan Marculescu',   2.7, 1),
  (current_date, 'Alphas Team', 'Dragomir Markovski',  1.0, 2),
  (current_date, 'Alphas Team', 'Thanos Floros',       null, 3),
  (current_date, 'Alphas Team', 'Elene Bibileishvili', null, 4),
  -- Breakers Team — OUR team (avg 1.4)
  (current_date, 'Breakers Team', 'Sandra Ehigiator',   1.5, 1),
  (current_date, 'Breakers Team', 'Alena Ivanova',      1.3, 2),
  (current_date, 'Breakers Team', 'Konstantin Skavitin', null, 3),
  (current_date, 'Breakers Team', 'Kujtim Krasniqi',    null, 4),
  (current_date, 'Breakers Team', 'Vladimir Kaverin',   null, 5),
  (current_date, 'Breakers Team', 'Kseniya Kultysheva', null, 6),
  -- Blasters Team (avg 1.3)
  (current_date, 'Blasters Team', 'Adam Brown',         1.3, 1),
  (current_date, 'Blasters Team', 'Viktoriya Hristova', null, 2),
  (current_date, 'Blasters Team', 'Celso Bispo',        null, 3),
  (current_date, 'Blasters Team', 'Adelina Stanciu',    null, 4),
  (current_date, 'Blasters Team', 'Carlotta Conversi',  null, 5),
  (current_date, 'Blasters Team', 'Maged Fouda',        null, 6),
  (current_date, 'Blasters Team', 'Martin Vrbata',      null, 7),
  -- Captains Team (avg 1.0)
  (current_date, 'Captains Team', 'Anastasiya Sarokina', 1.0, 1),
  (current_date, 'Captains Team', 'Teodora Roman',       null, 2),
  (current_date, 'Captains Team', 'Ali Noori',           null, 3),
  (current_date, 'Captains Team', 'Pavel Nikitin',       null, 4),
  (current_date, 'Captains Team', 'Lazaros Allilomis',   null, 5),
  (current_date, 'Captains Team', 'Mykhaylo Loboyko',    null, 6),
  (current_date, 'Captains Team', 'Amirkhon Koriev',     null, 7)
on conflict (recorded_at, team_name, member_name) do update set
  score = excluded.score,
  sort_order = excluded.sort_order;
