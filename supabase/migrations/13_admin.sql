-- =============================================================
-- FI Teamspace — Part 13: lightweight admin
-- One designated admin email gets DELETE + cross-row UPDATE rights
-- on profiles. Existing self-write policies remain for everyone.
-- =============================================================

-- Helper: is the calling user the system admin?
create or replace function public.is_admin() returns boolean
language sql stable as
$body$ select coalesce(auth.jwt() ->> 'email', '') = 'ska124.068@gmail.com' $body$;

-- profiles: admin can update / delete any row (in addition to self-write)
drop policy if exists profiles_admin_update on public.profiles;
drop policy if exists profiles_admin_delete on public.profiles;

create policy profiles_admin_update on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

create policy profiles_admin_delete on public.profiles
  for delete using (public.is_admin());

-- team_contacts: admin (and any authed user, per existing policy) can CRUD.
-- Already allowed; no extra policy needed.

-- meeting_attendance / sprint_completions / votes / etc. cascade-delete
-- when their parent rows go, so deleting a profile cleans up automatically
-- via the existing `on delete cascade` foreign keys to auth.users.
-- However profile.user_id → auth.users(id) on delete cascade is the parent
-- direction; deleting the profile row doesn't touch auth.users. Admin can
-- still wipe the app-side data this way; the auth account itself can be
-- removed from the Supabase Auth dashboard if needed.
