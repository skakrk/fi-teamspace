-- =============================================================
-- FI Teamspace — Part 3 of 3: Row Level Security
-- Run after 02_trigger.sql
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

drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_insert on public.profiles;
drop policy if exists profiles_update on public.profiles;
create policy profiles_select on public.profiles for select using (auth.uid() is not null);
create policy profiles_insert on public.profiles for insert with check (auth.uid() = user_id);
create policy profiles_update on public.profiles for update using (auth.uid() = user_id);

drop policy if exists sprints_select on public.sprints;
drop policy if exists sprints_write on public.sprints;
create policy sprints_select on public.sprints for select using (auth.uid() is not null);
create policy sprints_write on public.sprints for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists sprint_tasks_select on public.sprint_tasks;
drop policy if exists sprint_tasks_write on public.sprint_tasks;
create policy sprint_tasks_select on public.sprint_tasks for select using (auth.uid() is not null);
create policy sprint_tasks_write on public.sprint_tasks for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists task_progress_select on public.task_progress;
drop policy if exists task_progress_write on public.task_progress;
create policy task_progress_select on public.task_progress for select using (auth.uid() is not null);
create policy task_progress_write on public.task_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists meetings_select on public.meetings;
drop policy if exists meetings_write on public.meetings;
create policy meetings_select on public.meetings for select using (auth.uid() is not null);
create policy meetings_write on public.meetings for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists ma_select on public.meeting_attendance;
drop policy if exists ma_write on public.meeting_attendance;
create policy ma_select on public.meeting_attendance for select using (auth.uid() is not null);
create policy ma_write on public.meeting_attendance for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists mu_select on public.meeting_updates;
drop policy if exists mu_write on public.meeting_updates;
create policy mu_select on public.meeting_updates for select using (auth.uid() is not null);
create policy mu_write on public.meeting_updates for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists mn_select on public.meeting_notes;
drop policy if exists mn_write on public.meeting_notes;
create policy mn_select on public.meeting_notes for select using (auth.uid() is not null);
create policy mn_write on public.meeting_notes for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists pitches_select on public.pitches;
drop policy if exists pitches_write on public.pitches;
create policy pitches_select on public.pitches for select using (auth.uid() is not null);
create policy pitches_write on public.pitches for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists pf_select on public.pitch_feedback;
drop policy if exists pf_write on public.pitch_feedback;
create policy pf_select on public.pitch_feedback for select using (auth.uid() is not null);
create policy pf_write on public.pitch_feedback for all using (auth.uid() = reviewer_id) with check (auth.uid() = reviewer_id);

drop policy if exists pt_select on public.pitch_timings;
drop policy if exists pt_write on public.pitch_timings;
create policy pt_select on public.pitch_timings for select using (auth.uid() is not null);
create policy pt_write on public.pitch_timings for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists tv_select on public.team_vision;
drop policy if exists tv_write on public.team_vision;
create policy tv_select on public.team_vision for select using (auth.uid() is not null);
create policy tv_write on public.team_vision for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists fl_select on public.fi_leaderboard;
drop policy if exists fl_write on public.fi_leaderboard;
create policy fl_select on public.fi_leaderboard for select using (auth.uid() is not null);
create policy fl_write on public.fi_leaderboard for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists polls_select on public.polls;
drop policy if exists polls_write on public.polls;
create policy polls_select on public.polls for select using (auth.uid() is not null);
create policy polls_write on public.polls for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists po_select on public.poll_options;
drop policy if exists po_write on public.poll_options;
create policy po_select on public.poll_options for select using (auth.uid() is not null);
create policy po_write on public.poll_options for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists votes_select on public.votes;
drop policy if exists votes_write on public.votes;
create policy votes_select on public.votes for select using (auth.uid() is not null);
create policy votes_write on public.votes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
