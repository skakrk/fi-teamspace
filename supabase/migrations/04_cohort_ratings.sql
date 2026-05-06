-- =============================================================
-- FI Teamspace — Part 4: cohort ratings (per-member rating model)
-- Run after parts 1-3. Replaces fi_leaderboard with cohort_ratings.
-- =============================================================

-- Drop old aggregate-only table (data was placeholder)
drop table if exists public.fi_leaderboard cascade;

-- New: per-member rating, per snapshot
create table if not exists public.cohort_ratings (
  id uuid primary key default gen_random_uuid(),
  recorded_at date not null,
  team_name text not null,
  member_name text not null,
  score numeric(3,1),                  -- null = N/A
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (recorded_at, team_name, member_name)
);

create index if not exists cohort_ratings_recorded_idx on public.cohort_ratings(recorded_at);

alter table public.cohort_ratings enable row level security;

drop policy if exists cr_select on public.cohort_ratings;
drop policy if exists cr_write on public.cohort_ratings;
create policy cr_select on public.cohort_ratings for select using (auth.uid() is not null);
create policy cr_write on public.cohort_ratings for all using (auth.uid() is not null) with check (auth.uid() is not null);
