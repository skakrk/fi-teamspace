-- =============================================================
-- FI Teamspace — Part 19: Placeholder profiles
--
-- Lets the president create stand-in cards for teammates who
-- haven't signed up yet, fill in their data (project, pitch,
-- reflections, sprint progress), and have everything seamlessly
-- transfer to the real account when the person finally registers.
--
-- How it works:
--   * profiles.user_id stops referencing auth.users so it can hold
--     a freshly generated UUID for placeholders.
--   * Per-user content tables stop referencing auth.users and start
--     referencing profiles(user_id) ON UPDATE CASCADE — so when a
--     placeholder is rekeyed to a real auth user id, all child rows
--     follow automatically.
--   * handle_new_user is taught to look for an existing placeholder
--     with the new auth user's email; if found, it rekeys the
--     placeholder instead of inserting a new row (auto-merge).
--   * merge_placeholder_into_user() RPC supports manual merging when
--     the placeholder's email doesn't match (typo, different inbox,
--     etc.) — president-only, conflicts on composite keys are
--     resolved by keeping the target's row.
-- =============================================================

-- ---------- 1. Loosen FKs: profiles.user_id is no longer tied to auth.users
alter table public.profiles drop constraint if exists profiles_user_id_fkey;

-- ---------- 2. Repoint per-user content FKs to profiles(user_id) ON UPDATE CASCADE
-- meeting_updates
alter table public.meeting_updates drop constraint if exists meeting_updates_user_id_fkey;
alter table public.meeting_updates
  add constraint meeting_updates_user_id_fkey
  foreign key (user_id) references public.profiles(user_id)
  on update cascade on delete cascade;

-- meeting_attendance
alter table public.meeting_attendance drop constraint if exists meeting_attendance_user_id_fkey;
alter table public.meeting_attendance
  add constraint meeting_attendance_user_id_fkey
  foreign key (user_id) references public.profiles(user_id)
  on update cascade on delete cascade;

-- pitches
alter table public.pitches drop constraint if exists pitches_user_id_fkey;
alter table public.pitches
  add constraint pitches_user_id_fkey
  foreign key (user_id) references public.profiles(user_id)
  on update cascade on delete cascade;

-- pitch_feedback (reviewer)
alter table public.pitch_feedback drop constraint if exists pitch_feedback_reviewer_id_fkey;
alter table public.pitch_feedback
  add constraint pitch_feedback_reviewer_id_fkey
  foreign key (reviewer_id) references public.profiles(user_id)
  on update cascade on delete cascade;

-- pitch_timings
alter table public.pitch_timings drop constraint if exists pitch_timings_user_id_fkey;
alter table public.pitch_timings
  add constraint pitch_timings_user_id_fkey
  foreign key (user_id) references public.profiles(user_id)
  on update cascade on delete cascade;

-- task_progress
alter table public.task_progress drop constraint if exists task_progress_user_id_fkey;
alter table public.task_progress
  add constraint task_progress_user_id_fkey
  foreign key (user_id) references public.profiles(user_id)
  on update cascade on delete cascade;

-- sprint_completions
alter table public.sprint_completions drop constraint if exists sprint_completions_user_id_fkey;
alter table public.sprint_completions
  add constraint sprint_completions_user_id_fkey
  foreign key (user_id) references public.profiles(user_id)
  on update cascade on delete cascade;

-- member_milestones
alter table public.member_milestones drop constraint if exists member_milestones_user_id_fkey;
alter table public.member_milestones
  add constraint member_milestones_user_id_fkey
  foreign key (user_id) references public.profiles(user_id)
  on update cascade on delete cascade;

-- project_feedback (founder + reviewer)
alter table public.project_feedback drop constraint if exists project_feedback_founder_id_fkey;
alter table public.project_feedback
  add constraint project_feedback_founder_id_fkey
  foreign key (founder_id) references public.profiles(user_id)
  on update cascade on delete cascade;

alter table public.project_feedback drop constraint if exists project_feedback_reviewer_id_fkey;
alter table public.project_feedback
  add constraint project_feedback_reviewer_id_fkey
  foreign key (reviewer_id) references public.profiles(user_id)
  on update cascade on delete cascade;

-- votes
alter table public.votes drop constraint if exists votes_user_id_fkey;
alter table public.votes
  add constraint votes_user_id_fkey
  foreign key (user_id) references public.profiles(user_id)
  on update cascade on delete cascade;

-- audit / authorship columns: ON UPDATE CASCADE, SET NULL on delete
-- meetings.created_by
alter table public.meetings drop constraint if exists meetings_created_by_fkey;
alter table public.meetings
  add constraint meetings_created_by_fkey
  foreign key (created_by) references public.profiles(user_id)
  on update cascade on delete set null;

-- meeting_notes.updated_by
alter table public.meeting_notes drop constraint if exists meeting_notes_updated_by_fkey;
alter table public.meeting_notes
  add constraint meeting_notes_updated_by_fkey
  foreign key (updated_by) references public.profiles(user_id)
  on update cascade on delete set null;

-- team_vision.updated_by
alter table public.team_vision drop constraint if exists team_vision_updated_by_fkey;
alter table public.team_vision
  add constraint team_vision_updated_by_fkey
  foreign key (updated_by) references public.profiles(user_id)
  on update cascade on delete set null;

-- resources.posted_by
alter table public.resources drop constraint if exists resources_posted_by_fkey;
alter table public.resources
  add constraint resources_posted_by_fkey
  foreign key (posted_by) references public.profiles(user_id)
  on update cascade on delete set null;

-- filled_by columns from migration 18
alter table public.profiles drop constraint if exists profiles_filled_by_fkey;
alter table public.profiles
  add constraint profiles_filled_by_fkey
  foreign key (filled_by) references public.profiles(user_id)
  on update cascade on delete set null;

alter table public.meeting_updates drop constraint if exists meeting_updates_filled_by_fkey;
alter table public.meeting_updates
  add constraint meeting_updates_filled_by_fkey
  foreign key (filled_by) references public.profiles(user_id)
  on update cascade on delete set null;

alter table public.pitches drop constraint if exists pitches_filled_by_fkey;
alter table public.pitches
  add constraint pitches_filled_by_fkey
  foreign key (filled_by) references public.profiles(user_id)
  on update cascade on delete set null;

alter table public.task_progress drop constraint if exists task_progress_filled_by_fkey;
alter table public.task_progress
  add constraint task_progress_filled_by_fkey
  foreign key (filled_by) references public.profiles(user_id)
  on update cascade on delete set null;

alter table public.sprint_completions drop constraint if exists sprint_completions_filled_by_fkey;
alter table public.sprint_completions
  add constraint sprint_completions_filled_by_fkey
  foreign key (filled_by) references public.profiles(user_id)
  on update cascade on delete set null;

-- ---------- 3. Add is_placeholder flag
alter table public.profiles
  add column if not exists is_placeholder boolean not null default false;

-- Speed up the email lookup the trigger does on every signup
create index if not exists idx_profiles_placeholder_email
  on public.profiles (lower(email))
  where is_placeholder = true;

-- ---------- 4. Auto-merge: handle_new_user looks for matching placeholder
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $func$
declare
  placeholder_id uuid;
begin
  -- Look for an existing placeholder with this email (case-insensitive)
  select user_id into placeholder_id
  from public.profiles
  where is_placeholder = true
    and email is not null
    and lower(email) = lower(new.email)
  limit 1;

  if placeholder_id is not null then
    -- Re-key the placeholder to the real auth user id. ON UPDATE CASCADE
    -- carries every child row (reflections, pitches, sprint, ...) along.
    update public.profiles
    set user_id = new.id,
        is_placeholder = false,
        full_name = coalesce(
          nullif(full_name, ''),
          nullif(new.raw_user_meta_data->>'full_name', ''),
          split_part(new.email, '@', 1)
        ),
        filled_by = new.id,
        updated_at = now()
    where user_id = placeholder_id;
  else
    -- Standard insert
    insert into public.profiles (user_id, full_name, email, filled_by)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'full_name', ''),
      new.email,
      new.id
    )
    on conflict (user_id) do nothing;
  end if;

  return new;
end
$func$;

-- ---------- 5. Manual merge (fallback for typo'd emails)
create or replace function public.merge_placeholder_into_user(
  placeholder_user_id uuid,
  target_user_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $func$
declare
  src_is_placeholder boolean;
  tgt_is_placeholder boolean;
begin
  if not public.is_president(auth.uid()) then
    raise exception 'only the team president can merge placeholders';
  end if;

  if placeholder_user_id = target_user_id then
    raise exception 'cannot merge a profile into itself';
  end if;

  select is_placeholder into src_is_placeholder
  from public.profiles where user_id = placeholder_user_id;
  if not found or not src_is_placeholder then
    raise exception 'source profile is not a placeholder';
  end if;

  select is_placeholder into tgt_is_placeholder
  from public.profiles where user_id = target_user_id;
  if not found or tgt_is_placeholder then
    raise exception 'target must be a real (non-placeholder) profile';
  end if;

  -- For each per-user table, drop the placeholder's row when the target
  -- already has one (target wins), then move the rest.

  -- meeting_updates (PK: meeting_id, user_id)
  delete from public.meeting_updates
  where user_id = placeholder_user_id
    and meeting_id in (select meeting_id from public.meeting_updates where user_id = target_user_id);
  update public.meeting_updates set user_id = target_user_id where user_id = placeholder_user_id;

  -- meeting_attendance (PK: meeting_id, user_id)
  delete from public.meeting_attendance
  where user_id = placeholder_user_id
    and meeting_id in (select meeting_id from public.meeting_attendance where user_id = target_user_id);
  update public.meeting_attendance set user_id = target_user_id where user_id = placeholder_user_id;

  -- pitches (UNIQUE: user_id, version)
  delete from public.pitches
  where user_id = placeholder_user_id
    and version in (select version from public.pitches where user_id = target_user_id);
  update public.pitches set user_id = target_user_id where user_id = placeholder_user_id;

  -- pitch_feedback (UNIQUE: pitch_id, reviewer_id)
  delete from public.pitch_feedback
  where reviewer_id = placeholder_user_id
    and pitch_id in (select pitch_id from public.pitch_feedback where reviewer_id = target_user_id);
  update public.pitch_feedback set reviewer_id = target_user_id where reviewer_id = placeholder_user_id;

  -- pitch_timings (PK: meeting_id, user_id)
  delete from public.pitch_timings
  where user_id = placeholder_user_id
    and meeting_id in (select meeting_id from public.pitch_timings where user_id = target_user_id);
  update public.pitch_timings set user_id = target_user_id where user_id = placeholder_user_id;

  -- task_progress (PK: task_id, user_id)
  delete from public.task_progress
  where user_id = placeholder_user_id
    and task_id in (select task_id from public.task_progress where user_id = target_user_id);
  update public.task_progress set user_id = target_user_id where user_id = placeholder_user_id;

  -- sprint_completions (PK: sprint_id, user_id)
  delete from public.sprint_completions
  where user_id = placeholder_user_id
    and sprint_id in (select sprint_id from public.sprint_completions where user_id = target_user_id);
  update public.sprint_completions set user_id = target_user_id where user_id = placeholder_user_id;

  -- member_milestones (PK: milestone_id, user_id)
  delete from public.member_milestones
  where user_id = placeholder_user_id
    and milestone_id in (select milestone_id from public.member_milestones where user_id = target_user_id);
  update public.member_milestones set user_id = target_user_id where user_id = placeholder_user_id;

  -- project_feedback (no unique conflict)
  update public.project_feedback set founder_id = target_user_id where founder_id = placeholder_user_id;
  update public.project_feedback set reviewer_id = target_user_id where reviewer_id = placeholder_user_id;

  -- votes (PK: poll_id, option_id, user_id)
  delete from public.votes
  where user_id = placeholder_user_id
    and (poll_id, option_id) in (select poll_id, option_id from public.votes where user_id = target_user_id);
  update public.votes set user_id = target_user_id where user_id = placeholder_user_id;

  -- Authorship columns
  update public.meetings set created_by = target_user_id where created_by = placeholder_user_id;
  update public.meeting_notes set updated_by = target_user_id where updated_by = placeholder_user_id;
  update public.team_vision set updated_by = target_user_id where updated_by = placeholder_user_id;
  update public.resources set posted_by = target_user_id where posted_by = placeholder_user_id;
  update public.profiles set filled_by = target_user_id where filled_by = placeholder_user_id;

  -- Drop the now-empty placeholder
  delete from public.profiles where user_id = placeholder_user_id;
end
$func$;

grant execute on function public.merge_placeholder_into_user(uuid, uuid) to authenticated;
