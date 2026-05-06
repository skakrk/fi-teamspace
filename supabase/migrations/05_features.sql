-- =============================================================
-- FI Teamspace — Part 5: feature tables
-- (sprint completions, project feedback, resources, course milestones)
-- =============================================================

-- Per-founder sprint completion check
create table if not exists public.sprint_completions (
  sprint_id uuid not null references public.sprints(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  completed_at timestamptz not null default now(),
  notes text,
  primary key (sprint_id, user_id)
);

-- Project feedback (anyone leaves feedback on a founder's project)
create table if not exists public.project_feedback (
  id uuid primary key default gen_random_uuid(),
  founder_id uuid not null references auth.users(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  category text default 'general',  -- 'general' | 'positioning' | 'product' | 'gtm' | 'fundraising' | 'team'
  created_at timestamptz not null default now()
);

-- Knowledge sharing — founders post events / articles / opportunities
create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  posted_by uuid references auth.users(id) on delete set null,
  title text not null,
  url text,
  body text,
  category text default 'event',    -- 'event' | 'article' | 'opportunity' | 'tool' | 'other'
  event_date date,                  -- only for 'event'
  created_at timestamptz not null default now()
);

-- Course milestones (FI graduation requirements; static reference)
create table if not exists public.course_milestones (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  title text not null,
  description text,
  sort_order int not null default 0,
  required boolean not null default true
);

-- Per-founder progress on each milestone
create table if not exists public.member_milestones (
  milestone_id uuid not null references public.course_milestones(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started','in_progress','done')),
  notes text,
  updated_at timestamptz not null default now(),
  primary key (milestone_id, user_id)
);

-- =============================================================
-- RLS
-- =============================================================
alter table public.sprint_completions enable row level security;
alter table public.project_feedback enable row level security;
alter table public.resources enable row level security;
alter table public.course_milestones enable row level security;
alter table public.member_milestones enable row level security;

-- sprint_completions: any authed read; owner write
drop policy if exists sc_select on public.sprint_completions;
drop policy if exists sc_write on public.sprint_completions;
create policy sc_select on public.sprint_completions for select using (auth.uid() is not null);
create policy sc_write on public.sprint_completions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- project_feedback: any authed read; reviewer writes own
drop policy if exists pfb_select on public.project_feedback;
drop policy if exists pfb_write on public.project_feedback;
create policy pfb_select on public.project_feedback for select using (auth.uid() is not null);
create policy pfb_write on public.project_feedback for all using (auth.uid() = reviewer_id) with check (auth.uid() = reviewer_id);

-- resources: any authed read/write (poster can edit theirs; for now all team members)
drop policy if exists res_select on public.resources;
drop policy if exists res_write on public.resources;
create policy res_select on public.resources for select using (auth.uid() is not null);
create policy res_write on public.resources for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- course_milestones: any authed read/write (admin shared)
drop policy if exists cm_select on public.course_milestones;
drop policy if exists cm_write on public.course_milestones;
create policy cm_select on public.course_milestones for select using (auth.uid() is not null);
create policy cm_write on public.course_milestones for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- member_milestones: any authed read; owner write
drop policy if exists mm_select on public.member_milestones;
drop policy if exists mm_write on public.member_milestones;
create policy mm_select on public.member_milestones for select using (auth.uid() is not null);
create policy mm_write on public.member_milestones for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
