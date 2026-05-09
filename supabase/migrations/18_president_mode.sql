-- =============================================================
-- FI Teamspace — Part 18: President Mode (proxy editing)
--
-- Adds `filled_by` to all per-user content tables so the team
-- president can fill in data on behalf of teammates who do not
-- use the system. Per-record activity:
--   filled_by = user_id  -> owner-filled (active)
--   filled_by != user_id -> proxy-filled (by president)
--   record missing       -> proxy-candidate
-- The team-driven path is preserved because every owner write
-- sets filled_by = auth.uid() = user_id automatically (via the
-- application layer helper `withFilledBy`).
--
-- RLS expands write access to "owner OR president". The app is
-- the single source of truth for stamping filled_by — admin-only
-- columns (e.g. profiles.is_president) can be updated without
-- touching filled_by, preserving the original owner-vs-proxy
-- semantics across unrelated writes.
-- =============================================================

-- Helper: SECURITY DEFINER to avoid recursion when policies on
-- `profiles` themselves call this function.
create or replace function public.is_president(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where user_id = uid and is_president = true
  );
$$;

-- ---------- profiles ----------
alter table public.profiles
  add column if not exists filled_by uuid references auth.users(id) on delete set null;

update public.profiles set filled_by = user_id where filled_by is null;

drop policy if exists profiles_insert on public.profiles;
drop policy if exists profiles_update on public.profiles;
create policy profiles_insert on public.profiles
  for insert
  with check (auth.uid() = user_id or public.is_president(auth.uid()));
create policy profiles_update on public.profiles
  for update
  using (auth.uid() = user_id or public.is_president(auth.uid()))
  with check (auth.uid() = user_id or public.is_president(auth.uid()));

-- ---------- meeting_updates (reflections) ----------
alter table public.meeting_updates
  add column if not exists filled_by uuid references auth.users(id) on delete set null;

update public.meeting_updates set filled_by = user_id where filled_by is null;

drop policy if exists mu_write on public.meeting_updates;
create policy mu_write on public.meeting_updates
  for all
  using (auth.uid() = user_id or public.is_president(auth.uid()))
  with check (auth.uid() = user_id or public.is_president(auth.uid()));

create index if not exists idx_meeting_updates_proxy
  on public.meeting_updates(user_id)
  where filled_by is distinct from user_id;

-- ---------- pitches ----------
alter table public.pitches
  add column if not exists filled_by uuid references auth.users(id) on delete set null;

update public.pitches set filled_by = user_id where filled_by is null;

drop policy if exists pitches_write on public.pitches;
create policy pitches_write on public.pitches
  for all
  using (auth.uid() = user_id or public.is_president(auth.uid()))
  with check (auth.uid() = user_id or public.is_president(auth.uid()));

create index if not exists idx_pitches_proxy
  on public.pitches(user_id)
  where filled_by is distinct from user_id;

-- ---------- task_progress ----------
alter table public.task_progress
  add column if not exists filled_by uuid references auth.users(id) on delete set null;

update public.task_progress set filled_by = user_id where filled_by is null;

drop policy if exists task_progress_write on public.task_progress;
create policy task_progress_write on public.task_progress
  for all
  using (auth.uid() = user_id or public.is_president(auth.uid()))
  with check (auth.uid() = user_id or public.is_president(auth.uid()));

create index if not exists idx_task_progress_proxy
  on public.task_progress(user_id)
  where filled_by is distinct from user_id;

-- ---------- sprint_completions ----------
alter table public.sprint_completions
  add column if not exists filled_by uuid references auth.users(id) on delete set null;

update public.sprint_completions set filled_by = user_id where filled_by is null;

drop policy if exists sc_write on public.sprint_completions;
create policy sc_write on public.sprint_completions
  for all
  using (auth.uid() = user_id or public.is_president(auth.uid()))
  with check (auth.uid() = user_id or public.is_president(auth.uid()));

create index if not exists idx_sprint_completions_proxy
  on public.sprint_completions(user_id)
  where filled_by is distinct from user_id;

-- ---------- handle_new_user trigger ----------
-- New profiles must be self-owned (filled_by = user_id) so that
-- a freshly registered user is considered "active" by default.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $func$
begin
  insert into public.profiles (user_id, full_name, email, filled_by)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    new.email,
    new.id
  )
  on conflict (user_id) do nothing;
  return new;
end
$func$;
