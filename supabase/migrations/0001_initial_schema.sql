-- =============================================================
-- FI Teamspace — initial schema (clean, no $$-blocks except trigger)
-- Run in Supabase SQL Editor on a fresh project.
-- =============================================================

create extension if not exists "pgcrypto";

-- -------------------------------------------------------------
-- profiles
-- -------------------------------------------------------------
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  avatar_url text,
  about_me text,
  project_name text,
  project_description text,
  skills text,
  can_help_with text,
  need_help_with text,
  email text,
  phone text,
  linkedin text,
  twitter text,
  telegram text,
  website text,
  is_president boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -------------------------------------------------------------
-- sprints + tasks + per-user progress
-- -------------------------------------------------------------
create table if not exists public.sprints (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  week_number int not null,
  start_date date not null,
  end_date date not null,
  description text,
  is_current boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.sprint_tasks (
  id uuid primary key default gen_random_uuid(),
  sprint_id uuid not null references public.sprints(id) on delete cascade,
  title text not null,
  description text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.task_progress (
  task_id uuid not null references public.sprint_tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started','in_progress','done','blocked')),
  notes text,
  updated_at timestamptz not null default now(),
  primary key (task_id, user_id)
);

-- -------------------------------------------------------------
-- meetings
-- -------------------------------------------------------------
create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  scheduled_at timestamptz not null,
  duration_min int not null default 120,
  meet_url text,
  agenda text,
  status text not null default 'upcoming' check (status in ('upcoming','past','cancelled')),
  sprint_id uuid references public.sprints(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.meeting_attendance (
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'present' check (status in ('present','absent','late')),
  primary key (meeting_id, user_id)
);

create table if not exists public.meeting_updates (
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  success text,
  challenge text,
  learning text,
  updated_at timestamptz not null default now(),
  primary key (meeting_id, user_id)
);

create table if not exists public.meeting_notes (
  meeting_id uuid primary key references public.meetings(id) on delete cascade,
  content text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- -------------------------------------------------------------
-- pitches + feedback + timings (CENTRAL MODULE)
-- -------------------------------------------------------------
create table if not exists public.pitches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  version int not null,
  text_md text not null default '',
  target_duration_sec int not null default 60,
  video_url text,
  deck_url text,
  status text not null default 'draft' check (status in ('draft','ready','reviewed')),
  meeting_id uuid references public.meetings(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, version)
);

create table if not exists public.pitch_feedback (
  id uuid primary key default gen_random_uuid(),
  pitch_id uuid not null references public.pitches(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  what_works text,
  what_unclear text,
  suggestion text,
  score_clarity int check (score_clarity between 1 and 5),
  score_persuasive int check (score_persuasive between 1 and 5),
  created_at timestamptz not null default now(),
  unique (pitch_id, reviewer_id)
);

create table if not exists public.pitch_timings (
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  duration_sec int not null,
  primary key (meeting_id, user_id)
);

-- -------------------------------------------------------------
-- team-level vision/mission (single row)
-- -------------------------------------------------------------
create table if not exists public.team_vision (
  id int primary key default 1,
  vision text,
  mission text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);

insert into public.team_vision (id, vision, mission) values (1, '', '') on conflict (id) do nothing;

-- -------------------------------------------------------------
-- FI leaderboard snapshots
-- -------------------------------------------------------------
create table if not exists public.fi_leaderboard (
  id uuid primary key default gen_random_uuid(),
  recorded_at date not null,
  team_name text not null,
  score numeric(3,1) not null,
  rank int,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------
-- polls + options + votes
-- -------------------------------------------------------------
create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  type text not null default 'single' check (type in ('single','multiple')),
  is_anonymous boolean not null default false,
  deadline timestamptz,
  status text not null default 'open' check (status in ('open','closed')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  label text not null,
  sort_order int not null default 0
);

create table if not exists public.votes (
  poll_id uuid not null references public.polls(id) on delete cascade,
  option_id uuid not null references public.poll_options(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (poll_id, option_id, user_id)
);

-- =============================================================
-- Trigger: auto-create profile on signup
-- =============================================================
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $func$
begin
  insert into public.profiles (user_id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), new.email)
  on conflict (user_id) do nothing;
  return new;
end
$func$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================
alter table public.profiles enable row level security;
alter table public.sprints enable row level security;
alter table public.sprint_tasks enable row level security;
alter table public.task_progress enable row level security;
alter table public.meetings enable row level security;
alter table public.meeting_attendance enable row level security;
alter table public.meeting_updates enable row level security;
alter table public.meeting_notes enable row level security;
alter table public.pitches enable row level security;
alter table public.pitch_feedback enable row level security;
alter table public.pitch_timings enable row level security;
alter table public.team_vision enable row level security;
alter table public.fi_leaderboard enable row level security;
alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.votes enable row level security;

-- profiles
drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_insert on public.profiles;
drop policy if exists profiles_update on public.profiles;
create policy profiles_select on public.profiles for select using (auth.uid() is not null);
create policy profiles_insert on public.profiles for insert with check (auth.uid() = user_id);
create policy profiles_update on public.profiles for update using (auth.uid() = user_id);

-- sprints
drop policy if exists sprints_select on public.sprints;
drop policy if exists sprints_write on public.sprints;
create policy sprints_select on public.sprints for select using (auth.uid() is not null);
create policy sprints_write on public.sprints for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- sprint_tasks
drop policy if exists sprint_tasks_select on public.sprint_tasks;
drop policy if exists sprint_tasks_write on public.sprint_tasks;
create policy sprint_tasks_select on public.sprint_tasks for select using (auth.uid() is not null);
create policy sprint_tasks_write on public.sprint_tasks for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- task_progress
drop policy if exists task_progress_select on public.task_progress;
drop policy if exists task_progress_write on public.task_progress;
create policy task_progress_select on public.task_progress for select using (auth.uid() is not null);
create policy task_progress_write on public.task_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- meetings
drop policy if exists meetings_select on public.meetings;
drop policy if exists meetings_write on public.meetings;
create policy meetings_select on public.meetings for select using (auth.uid() is not null);
create policy meetings_write on public.meetings for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- meeting_attendance
drop policy if exists ma_select on public.meeting_attendance;
drop policy if exists ma_write on public.meeting_attendance;
create policy ma_select on public.meeting_attendance for select using (auth.uid() is not null);
create policy ma_write on public.meeting_attendance for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- meeting_updates
drop policy if exists mu_select on public.meeting_updates;
drop policy if exists mu_write on public.meeting_updates;
create policy mu_select on public.meeting_updates for select using (auth.uid() is not null);
create policy mu_write on public.meeting_updates for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- meeting_notes
drop policy if exists mn_select on public.meeting_notes;
drop policy if exists mn_write on public.meeting_notes;
create policy mn_select on public.meeting_notes for select using (auth.uid() is not null);
create policy mn_write on public.meeting_notes for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- pitches
drop policy if exists pitches_select on public.pitches;
drop policy if exists pitches_write on public.pitches;
create policy pitches_select on public.pitches for select using (auth.uid() is not null);
create policy pitches_write on public.pitches for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- pitch_feedback
drop policy if exists pf_select on public.pitch_feedback;
drop policy if exists pf_write on public.pitch_feedback;
create policy pf_select on public.pitch_feedback for select using (auth.uid() is not null);
create policy pf_write on public.pitch_feedback for all using (auth.uid() = reviewer_id) with check (auth.uid() = reviewer_id);

-- pitch_timings
drop policy if exists pt_select on public.pitch_timings;
drop policy if exists pt_write on public.pitch_timings;
create policy pt_select on public.pitch_timings for select using (auth.uid() is not null);
create policy pt_write on public.pitch_timings for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- team_vision
drop policy if exists tv_select on public.team_vision;
drop policy if exists tv_write on public.team_vision;
create policy tv_select on public.team_vision for select using (auth.uid() is not null);
create policy tv_write on public.team_vision for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- fi_leaderboard
drop policy if exists fl_select on public.fi_leaderboard;
drop policy if exists fl_write on public.fi_leaderboard;
create policy fl_select on public.fi_leaderboard for select using (auth.uid() is not null);
create policy fl_write on public.fi_leaderboard for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- polls
drop policy if exists polls_select on public.polls;
drop policy if exists polls_write on public.polls;
create policy polls_select on public.polls for select using (auth.uid() is not null);
create policy polls_write on public.polls for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- poll_options
drop policy if exists po_select on public.poll_options;
drop policy if exists po_write on public.poll_options;
create policy po_select on public.poll_options for select using (auth.uid() is not null);
create policy po_write on public.poll_options for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- votes
drop policy if exists votes_select on public.votes;
drop policy if exists votes_write on public.votes;
create policy votes_select on public.votes for select using (auth.uid() is not null);
create policy votes_write on public.votes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
