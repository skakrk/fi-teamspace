-- =============================================================
-- FI Teamspace — Part 1 of 3: tables only
-- Run first.
-- =============================================================

create extension if not exists "pgcrypto";

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

create table if not exists public.team_vision (
  id int primary key default 1,
  vision text,
  mission text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);

insert into public.team_vision (id, vision, mission) values (1, '', '') on conflict (id) do nothing;

create table if not exists public.fi_leaderboard (
  id uuid primary key default gen_random_uuid(),
  recorded_at date not null,
  team_name text not null,
  score numeric(3,1) not null,
  rank int,
  created_at timestamptz not null default now()
);

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
